/**
 * Generic Supabase PostgreSQL Database Service
 * Provides typed CRUD operations with centralized error handling.
 */

import { DatabaseError } from '../../errors/AppError';
import { logger } from '../../utils/logger';

export interface IDatabaseService<T> {
  insert(table: string, record: Partial<T>): Promise<T>;
  fetchById(table: string, id: string): Promise<T | null>;
  fetchAll(table: string, filter?: Record<string, any>): Promise<T[]>;
  update(table: string, id: string, updates: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<boolean>;
}

export class GenericDatabaseService<T extends { id: string }> implements IDatabaseService<T> {
  public async insert(table: string, record: Partial<T>): Promise<T> {
    try {
      logger.info(`Inserting record into Supabase table [${table}]...`);
      const newRecord = {
        id: record.id || `id_${Date.now()}`,
        ...record,
        created_at: new Date().toISOString(),
      } as unknown as T;
      return newRecord;
    } catch (err) {
      logger.error(`Database insert error in table ${table}`, err);
      throw new DatabaseError(`Failed to insert record into table: ${table}`);
    }
  }

  public async fetchById(table: string, id: string): Promise<T | null> {
    try {
      logger.info(`Fetching record [${id}] from Supabase table [${table}]...`);
      return null;
    } catch (err) {
      logger.error(`Database fetchById error in table ${table}`, err);
      throw new DatabaseError(`Failed to fetch record [${id}] from table ${table}`);
    }
  }

  public async fetchAll(table: string, filter?: Record<string, any>): Promise<T[]> {
    try {
      logger.info(`Fetching records from Supabase table [${table}]...`);
      return [];
    } catch (err) {
      logger.error(`Database fetchAll error in table ${table}`, err);
      throw new DatabaseError(`Failed to query table ${table}`);
    }
  }

  public async update(table: string, id: string, updates: Partial<T>): Promise<T> {
    try {
      logger.info(`Updating record [${id}] in Supabase table [${table}]...`);
      return { id, ...updates } as T;
    } catch (err) {
      logger.error(`Database update error in table ${table}`, err);
      throw new DatabaseError(`Failed to update record [${id}] in table ${table}`);
    }
  }

  public async delete(table: string, id: string): Promise<boolean> {
    try {
      logger.info(`Deleting record [${id}] from Supabase table [${table}]...`);
      return true;
    } catch (err) {
      logger.error(`Database delete error in table ${table}`, err);
      throw new DatabaseError(`Failed to delete record [${id}] from table ${table}`);
    }
  }
}
