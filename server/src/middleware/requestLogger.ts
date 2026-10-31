import { Request, Response, NextFunction } from 'express';

/**
 * Request timing and audit logger middleware.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    const logColor =
      status >= 500
        ? '\x1b[31m' // Red
        : status >= 400
        ? '\x1b[33m' // Yellow
        : status >= 300
        ? '\x1b[36m' // Cyan
        : '\x1b[32m'; // Green

    const resetColor = '\x1b[0m';

    console.log(
      `[HTTP] ${method} ${url} ${logColor}${status}${resetColor} - ${timeInMs}ms`
    );
  });

  next();
}

