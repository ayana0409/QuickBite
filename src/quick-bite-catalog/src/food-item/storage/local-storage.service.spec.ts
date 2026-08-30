import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';
import { ProcessedFile } from './storage.interface';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testUploadDir = path.resolve(process.cwd(), 'test-uploads');

  beforeAll(() => {
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
    // Override uploadDir for test isolation
    (service as any).uploadDir = testUploadDir;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should upload a file and return filename', async () => {
    const file: ProcessedFile = {
      buffer: Buffer.from('test webp data'),
      originalName: 'test.jpg',
      mimeType: 'image/webp',
    };

    const filename = await service.uploadFile(file);
    expect(filename).toMatch(/^food-.+\.webp$/);

    const savedFilePath = path.join(testUploadDir, filename);
    expect(fs.existsSync(savedFilePath)).toBe(true);

    // Clean up
    await service.deleteFile(filename);
    expect(fs.existsSync(savedFilePath)).toBe(false);
  });

  it('should upload multiple files and delete batch on cleanup', async () => {
    const files: ProcessedFile[] = [
      { buffer: Buffer.from('file1'), originalName: '1.jpg', mimeType: 'image/webp' },
      { buffer: Buffer.from('file2'), originalName: '2.jpg', mimeType: 'image/webp' },
    ];

    const filenames = await service.uploadFiles(files);
    expect(filenames.length).toBe(2);

    filenames.forEach((fn) => {
      expect(fs.existsSync(path.join(testUploadDir, fn))).toBe(true);
    });

    await service.deleteFiles(filenames);

    filenames.forEach((fn) => {
      expect(fs.existsSync(path.join(testUploadDir, fn))).toBe(false);
    });
  });

  it('should not throw when deleting non-existent file', async () => {
    await expect(service.deleteFile('non-existent.webp')).resolves.not.toThrow();
  });
});
