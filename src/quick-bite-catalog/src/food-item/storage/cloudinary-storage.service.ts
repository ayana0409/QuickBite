import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { IStorageService, ProcessedFile } from './storage.interface';

@Injectable()
export class CloudinaryStorageService implements IStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly folder: string;

  constructor(private readonly configService: ConfigService) {
    // Read Cloudinary folder destination from environment variable CLOUDINARY_FOLDER (default: 'quick-bite/food-items')
    this.folder = this.configService.get<string>('CLOUDINARY_FOLDER') || 'quick-bite/food-items';

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || '';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') || '';
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET') || '';

    // Initialize Cloudinary SDK config with environment variables
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        `⚠️ Cloudinary credentials missing! cloud_name: '${cloudName ? 'OK' : 'MISSING'}', api_key: '${apiKey ? 'OK' : 'MISSING'}', api_secret: '${apiSecret ? 'OK' : 'MISSING'}'`,
      );
    } else {
      this.logger.log(`CloudinaryStorageService initialized with cloud: '${cloudName}', folder: '${this.folder}'`);
    }
  }

  /**
   * Upload single buffer to Cloudinary using upload_stream
   * Returns only filename (e.g. food-{uuid}-{timestamp}.webp)
   */
  async uploadFile(file: ProcessedFile): Promise<string> {
    const publicId = `food-${randomUUID()}-${Date.now()}`;
    const filename = `${publicId}.webp`;

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          public_id: publicId,
          format: 'webp',
          resource_type: 'image',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            const errorDetails = error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'No result';
            this.logger.error(
              `Cloudinary upload failed for ${filename}: ${error?.message || 'Unknown error'}. Details: ${errorDetails}`,
            );
            return reject(
              new Error(`Cloudinary upload failed (HTTP ${error?.http_code || 403}): ${error?.message || 'Invalid credentials or permissions'}`),
            );
          }
          this.logger.log(`Uploaded to Cloudinary: ${filename} (URL: ${result.secure_url})`);
          // Store only filename in DB as required
          resolve(filename);
        },
      );

      // Stream buffer directly to Cloudinary without creating temporary local files
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }


  /**
   * Batch upload files to Cloudinary. Cleans up partial uploads if any file fails.
   */
  async uploadFiles(files: ProcessedFile[]): Promise<string[]> {
    const filenames: string[] = [];
    try {
      for (const file of files) {
        const filename = await this.uploadFile(file);
        filenames.push(filename);
      }
      return filenames;
    } catch (error: any) {
      this.logger.error('Error during batch Cloudinary upload. Cleaning up partial uploads...', error?.stack);
      await this.deleteFiles(filenames);
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary by public ID
   */
  async deleteFile(filename: string): Promise<void> {
    if (!filename) return;
    try {
      // Remove file extension to construct publicId
      const cleanName = filename.replace(/\.[^/.]+$/, '');
      const publicId = `${this.folder}/${cleanName}`;

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
      this.logger.log(`Deleted Cloudinary file: ${publicId}, result: ${JSON.stringify(result)}`);
    } catch (error: any) {
      this.logger.warn(`Failed to delete Cloudinary file ${filename}: ${error?.message}`);
    }
  }

  /**
   * Delete multiple files concurrently using Promise.allSettled
   */
  async deleteFiles(filenames: string[]): Promise<void> {
    if (!filenames || filenames.length === 0) return;
    await Promise.allSettled(filenames.map((name) => this.deleteFile(name)));
  }
}
