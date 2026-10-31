import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded regardless of process working directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

/**
 * Global declaration for PrismaClient to prevent connection exhaustion
 * during hot-reload cycles in development environments.
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Factory creating an orchestrated PrismaClient with environment-aware logging.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
    errorFormat: isProduction ? 'minimal' : 'pretty',
  });
}

/**
 * Singleton database client instance.
 */
export const prisma: PrismaClient = globalThis.prismaGlobal ?? createPrismaClient();

if (!isProduction) {
  globalThis.prismaGlobal = prisma;
}

/**
 * Gracefully disconnects Prisma ORM from PostgreSQL database pool.
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[Prisma] Successfully disconnected from database pool.');
  } catch (error) {
    console.error('[Prisma] Error during database disconnect:', error);
    process.exit(1);
  }
}

/**
 * Register process signal handlers for clean teardown.
 */
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`[Process] Received ${signal}. Closing Prisma client connections...`);
    await disconnectPrisma();
    process.exit(0);
  });
});

