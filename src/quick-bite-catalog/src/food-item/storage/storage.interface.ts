export interface ProcessedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface IStorageService {
  uploadFile(file: ProcessedFile): Promise<string>;
  uploadFiles(files: ProcessedFile[]): Promise<string[]>;
  deleteFile(filename: string): Promise<void>;
  deleteFiles(filenames: string[]): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
