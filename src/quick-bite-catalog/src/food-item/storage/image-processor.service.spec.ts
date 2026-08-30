import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessorService } from './image-processor.service';

describe('ImageProcessorService', () => {
  let service: ImageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessorService],
    }).compile();

    service = module.get<ImageProcessorService>(ImageProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should compress a valid image buffer to webp with max 1000px width', async () => {
    // Generate a 1200x800 sample PNG buffer using sharp
    const samplePngBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const mockFile = {
      buffer: samplePngBuffer,
      originalname: 'sample.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const result = await service.processImage(mockFile);

    expect(result).toBeDefined();
    expect(result.originalName).toBe('sample.png');
    expect(result.mimeType).toBe('image/webp');

    // Inspect processed image metadata
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(1000);
  });

  it('should throw BadRequestException on corrupt/invalid buffer', async () => {
    const corruptFile = {
      buffer: Buffer.from('not an image data at all'),
      originalname: 'corrupt.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(service.processImage(corruptFile)).rejects.toThrow(BadRequestException);
  });
});
