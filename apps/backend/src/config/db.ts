import dns from 'dns';
import { PrismaClient } from '@prisma/client';

// Configure Node.js DNS to use Google DNS for reliable MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback to system resolver
}

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  console.log('🍃 Connecting NearWork to MongoDB Atlas (Jokecluster)...');
  return new PrismaClient();
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
