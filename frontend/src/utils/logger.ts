/**
 * Production-Safe Logger Service
 * Suppresses debug & info console logs automatically when in production mode (`IS_PRODUCTION === true`).
 */

import { envConfig } from '../config/env.config';

export class LoggerService {
  private isProduction: boolean;

  constructor() {
    this.isProduction = envConfig.IS_PRODUCTION;
  }

  public info(message: string, ...meta: any[]): void {
    if (!this.isProduction) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }

  public warn(message: string, ...meta: any[]): void {
    if (!this.isProduction) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }

  public error(message: string, error?: unknown, ...meta: any[]): void {
    // Error logs are always retained for crash diagnostics
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error, ...meta);
  }

  public debug(message: string, ...meta: any[]): void {
    if (!this.isProduction) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }
}

export const logger = new LoggerService();
