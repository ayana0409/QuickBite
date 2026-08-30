import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IStorageService, ProcessedFile } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    // Read local upload folder path from environment variable UPLOAD_DIR (default: 'uploads')
    const customDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    this.uploadDir = path.isAbsolute(customDir)
      ? customDir
      : path.resolve(process.cwd(), customDir);
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Save single processed file to local disk
   * Filename format: food-{uuid}-{timestamp}.webp
   */
  async uploadFile(file: ProcessedFile): Promise<string> {
    const filename = `food-${randomUUID()}-${Date.now()}.webp`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);
    this.logger.log(`Saved local file: ${filename}`);
    return filename;
  }

  /**
   * Batch upload files. If any file fails, delete previous uploads to prevent orphaned files.
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
      this.logger.error(`Error during batch upload. Cleaning up partial uploads...`, error?.stack);
      await this.deleteFiles(filenames);
      throw error;
    }
  }

  /**
   * Delete single file from local disk. Safe from directory traversal.
   * Does not throw if file doesn't exist.
   */
  async deleteFile(filename: string): Promise<void> {
    if (!filename) return;
    try {
      const safeFilename = path.basename(filename);
      const filePath = path.join(this.uploadDir, safeFilename);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted local file: ${safeFilename}`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to delete local file ${filename}: ${error?.message}`);
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
