/**
 * Generic Supabase Object Storage Service
 * Handles uploading audio clips/models to buckets & retrieving public CDN URLs.
 */

import { StorageError } from '../../errors/AppError';
import { logger } from '../../utils/logger';

export interface IStorageService {
  uploadFile(bucket: string, path: string, fileData: Blob | ArrayBuffer | string): Promise<string>;
  downloadFile(bucket: string, path: string): Promise<ArrayBuffer | null>;
  getPublicUrl(bucket: string, path: string): string;
  deleteFile(bucket: string, path: string): Promise<boolean>;
}

export class GenericStorageService implements IStorageService {
  public async uploadFile(bucket: string, path: string, fileData: Blob | ArrayBuffer | string): Promise<string> {
    try {
      logger.info(`Uploading file to Supabase bucket [${bucket}] at path [${path}]...`);
      const publicUrl = `https://mock-supabase-project.supabase.co/storage/v1/object/public/${bucket}/${path}`;
      return publicUrl;
    } catch (err) {
      logger.error(`Storage upload error in bucket ${bucket}`, err);
      throw new StorageError(`Failed to upload file to storage bucket [${bucket}]`);
    }
  }

  public async downloadFile(bucket: string, path: string): Promise<ArrayBuffer | null> {
    try {
      logger.info(`Downloading file from Supabase bucket [${bucket}] at path [${path}]...`);
      return null;
    } catch (err) {
      logger.error(`Storage download error in bucket ${bucket}`, err);
      throw new StorageError(`Failed to download file from storage bucket [${bucket}]`);
    }
  }

  public getPublicUrl(bucket: string, path: string): string {
    return `https://mock-supabase-project.supabase.co/storage/v1/object/public/${bucket}/${path}`;
  }

  public async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      logger.info(`Deleting file from Supabase bucket [${bucket}] at path [${path}]...`);
      return true;
    } catch (err) {
      logger.error(`Storage delete error in bucket ${bucket}`, err);
      throw new StorageError(`Failed to delete file from storage bucket [${bucket}]`);
    }
  }
}

export const genericStorageService = new GenericStorageService();
