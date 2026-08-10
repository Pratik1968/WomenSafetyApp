/**
 * Custom AppError Hierarchy for System-Wide Exceptions
 */

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code: string = 'DB_ERROR') {
    super(message, code, 500);
  }
}

export class StorageError extends AppError {
  constructor(message: string, code: string = 'STORAGE_ERROR') {
    super(message, code, 500);
  }
}

export class HardwareError extends AppError {
  constructor(message: string, code: string = 'HW_ERROR') {
    super(message, code, 503);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
