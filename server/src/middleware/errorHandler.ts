import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiResponse } from '../types/index.js';

/**
 * Custom Operational Application Error class for domain errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Express Error Handling Middleware.
 * Translates Prisma ORM errors, Zod validation issues, and operational
 * faults into structured JSON payloads.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(422).json({
      success: false,
      error: `Validation error: ${formattedErrors}`,
      meta: { timestamp, version: '1.0.0' },
    });
    return;
  }

  // 2. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g., P2002: unique index conflict)
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(', ')
        : 'Unique field';
      res.status(409).json({
        success: false,
        error: `Conflict: Unique constraint violated on [${target}]. Duplicate entry detected.`,
        meta: { timestamp, version: '1.0.0' },
      });
      return;
    }

    // Foreign key violation
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'Foreign key constraint failed. Related resource does not exist.',
        meta: { timestamp, version: '1.0.0' },
      });
      return;
    }

    // Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Requested entity was not found in the database.',
        meta: { timestamp, version: '1.0.0' },
      });
      return;
    }
  }

  // 3. Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Database query validation error. Check required parameters and types.',
      meta: { timestamp, version: '1.0.0' },
    });
    return;
  }

  // 4. Custom AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      meta: { timestamp, version: '1.0.0' },
    });
    return;
  }

  // 5. Unhandled / Internal Server Errors
  const errorMessage = err instanceof Error ? err.message : 'Internal server error';
  console.error('[Unhandled Error caught by middleware]:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : errorMessage,
    meta: { timestamp, version: '1.0.0' },
  });
}

