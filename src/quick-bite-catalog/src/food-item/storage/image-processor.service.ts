import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { ProcessedFile } from './storage.interface';

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  /**
   * Process and compress image:
   * - Max width 1000px (preserving aspect ratio, avoid enlarging smaller images)
   * - Convert to .webp format
   * - Quality 80
   */
  async processImage(file: Express.Multer.File): Promise<ProcessedFile> {
    try {
      const compressedBuffer = await sharp(file.buffer)
        .resize({
          width: 1000,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 80 })
        .toBuffer();

      return {
        buffer: compressedBuffer,
        originalName: file.originalname,
        mimeType: 'image/webp',
      };
    } catch (error: any) {
      this.logger.error(`Failed to process image ${file.originalname}: ${error?.message}`, error?.stack);
      throw new BadRequestException(`Failed to process image ${file.originalname}: Invalid or corrupted image`);
    }
  }

  /**
   * Process multiple images concurrently
   */
  async processImages(files: Express.Multer.File[]): Promise<ProcessedFile[]> {
    return Promise.all(files.map((file) => this.processImage(file)));
  }
}
