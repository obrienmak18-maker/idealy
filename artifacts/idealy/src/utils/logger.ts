/**
 * Structured logging utility for the application.
 * In production, this could be connected to a logging service.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  missionId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (this.isDevelopment) {
      const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
      console[level](`${prefix} ${message}${contextStr}`);
    } else {
      // In production, send to logging service
      // Example: sendToLoggingService({ level, message, context, timestamp });
      if (level === 'error') {
        console.error(prefix, message, context);
      }
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.formatMessage('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.formatMessage('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error ? {
        message: error.message,
        name: error.name,
        stack: this.isDevelopment ? error.stack : undefined,
      } : undefined,
    };
    this.formatMessage('error', message, errorContext);
  }
}

export const logger = new Logger();