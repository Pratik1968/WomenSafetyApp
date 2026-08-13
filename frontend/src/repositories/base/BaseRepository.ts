/**
 * Generic Base Repository Abstraction (Repository Pattern)
 * Separates persistent data storage logic from business services.
 */

export interface IRepository<T> {
  create(entity: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T extends { id: string }> implements IRepository<T> {
  protected abstract tableName: string;

  public async create(entity: Partial<T>): Promise<T> {
    const newEntity = {
      id: entity.id || `id_${Date.now()}`,
      ...entity,
    } as T;
    return newEntity;
  }

  public async findById(id: string): Promise<T | null> {
    return null;
  }

  public async findAll(): Promise<T[]> {
    return [];
  }

  public async update(id: string, entity: Partial<T>): Promise<T> {
    return { id, ...entity } as T;
  }

  public async delete(id: string): Promise<boolean> {
    return true;
  }
}
