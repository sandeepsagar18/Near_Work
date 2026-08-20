import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client/web';

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoAuthToken) {
    try {
      console.log(`🌐 Connecting NearWork to Turso Cloud Database: ${tursoUrl}`);
      const adapter = new PrismaLibSql({
        url: tursoUrl,
        authToken: tursoAuthToken
      });
      return new PrismaClient({ adapter } as any);
    } catch (err) {
      console.error('⚠️ Failed to initialize Turso adapter, falling back to standard client:', err);
      return new PrismaClient();
    }
  }

  console.log('📁 Connecting NearWork to Local SQLite Database');
  return new PrismaClient();
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
