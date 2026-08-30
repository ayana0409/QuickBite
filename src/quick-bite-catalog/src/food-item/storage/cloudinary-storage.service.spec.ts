import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { ProcessedFile } from './storage.interface';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryStorageService', () => {
  let service: CloudinaryStorageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
              if (key === 'CLOUDINARY_API_KEY') return 'test-key';
              if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
              if (key === 'CLOUDINARY_FOLDER') return 'custom-folder/foods';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CloudinaryStorageService>(CloudinaryStorageService);
  });

  it('should initialize with custom CLOUDINARY_FOLDER from environment', () => {
    expect(service).toBeDefined();
    expect((service as any).folder).toBe('custom-folder/foods');
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-key',
      api_secret: 'test-secret',
      secure: true,
    });
  });

  it('should upload a file via stream and return filename', async () => {
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
      // Return a writable mock stream
      const { Writable } = require('stream');
      const stream = new Writable({
        write(chunk: any, encoding: any, next: any) {
          next();
        },
      });
      // Simulate successful upload callback
      process.nextTick(() => {
        callback(null, { secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/food.webp' });
      });
      return stream;
    });

    const file: ProcessedFile = {
      buffer: Buffer.from('mock webp buffer'),
      originalName: 'test.jpg',
      mimeType: 'image/webp',
    };

    const filename = await service.uploadFile(file);
    expect(filename).toMatch(/^food-.+\.webp$/);
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'custom-folder/foods',
        format: 'webp',
        resource_type: 'image',
      }),
      expect.any(Function),
    );
  });

  it('should delete a file using configured folder prefix and destroy API', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    await service.deleteFile('food-123.webp');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('custom-folder/foods/food-123', {
      resource_type: 'image',
    });
  });

  it('should delete multiple files concurrently', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    await service.deleteFiles(['food-1.webp', 'food-2.webp']);

    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
  });
});
