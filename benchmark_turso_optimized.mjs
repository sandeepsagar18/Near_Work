import { createClient } from '@libsql/client/web';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import { appCache, CACHE_TTL } from './apps/backend/src/utils/cache.ts';

const tursoUrl = 'libsql://nearwork-db-nearwork.aws-ap-south-1.turso.io';
const tursoAuthToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMDQ0NjUsImlkIjoiMDFhMDFkYWYtZjAwMS03YzAyLTlkNTctZWNlMmExM2E4ZmE3Iiwia2lkIjoicnNLV3JGRXBCSUw5ZUtLNl9mY2lHelFrdy1jLXpud3NlVFBSc204ckNhVSIsInJpZCI6ImQ5MmZkOTgwLTZmOGQtNDk0Mi1hOGY0LWZkZjQ0NmY0MDViMiJ9.dkducrMTmaRdjbaegej6930ixn9oTir5k-JnHukOkbSrebnLANfSzDMvnzkT4gqYMClQyDfffKEqCuL784nNBA';

const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoAuthToken });
const prisma = new PrismaClient({ adapter });

async function runOptimizedBenchmark() {
  console.log('=== BENCHMARKING TURSO CLOUD DATABASE (AFTER OPTIMIZATIONS) ===\n');

  // 1. Optimized Login
  const loginStart = performance.now();
  const user = await prisma.user.findUnique({
    where: { email: 'customer@nearwork.com' },
    include: {
      workerProfile: { select: { id: true, status: true, verificationStatus: true, averageRating: true } },
      adminProfile: { select: { id: true, department: true } }
    }
  });
  const passStart = performance.now();
  const isMatch = await bcrypt.compare('password123', user.passwordHash);
  const passTime = performance.now() - passStart;
  const loginTotal = performance.now() - loginStart;
  console.log(`Login Endpoint Optimized: ${loginTotal.toFixed(2)} ms (DB fetch: ${(loginTotal - passTime).toFixed(2)} ms, bcrypt: ${passTime.toFixed(2)} ms)`);

  // 2. Services (Cached & Index-Accelerated)
  const servicesColdStart = performance.now();
  const fetchServices = () => prisma.service.findMany({ where: { isActive: true }, include: { category: true } });
  await appCache.getOrSet('services_all', CACHE_TTL.SERVICES, fetchServices);
  const servicesColdTime = performance.now() - servicesColdStart;

  const servicesWarmStart = performance.now();
  const cachedServices = await appCache.getOrSet('services_all', CACHE_TTL.SERVICES, fetchServices);
  const servicesWarmTime = performance.now() - servicesWarmStart;
  console.log(`Services Endpoint: ${servicesWarmTime.toFixed(2)} ms (Cached/Warm), Cold: ${servicesColdTime.toFixed(2)} ms`);

  // 3. Categories (Cached & Index-Accelerated)
  const catsColdStart = performance.now();
  const fetchCats = () => prisma.serviceCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  await appCache.getOrSet('all_categories', CACHE_TTL.CATEGORIES, fetchCats);
  const catsColdTime = performance.now() - catsColdStart;

  const catsWarmStart = performance.now();
  const cachedCats = await appCache.getOrSet('all_categories', CACHE_TTL.CATEGORIES, fetchCats);
  const catsWarmTime = performance.now() - catsWarmStart;
  console.log(`Categories Endpoint: ${catsWarmTime.toFixed(2)} ms (Cached/Warm), Cold: ${catsColdTime.toFixed(2)} ms`);

  // 4. Customer Profile (Index-Accelerated)
  const profileStart = performance.now();
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, avatarUrl: true,
      addresses: { orderBy: { isDefault: 'desc' } }
    }
  });
  const profileTime = performance.now() - profileStart;
  console.log(`Customer Profile Endpoint Optimized: ${profileTime.toFixed(2)} ms`);

  // 5. Bookings List (Index-Accelerated)
  const bookingsStart = performance.now();
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: {
      service: { include: { category: true } },
      worker: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
      address: true,
      payment: true,
      invoice: true,
      review: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  const bookingsTime = performance.now() - bookingsStart;
  console.log(`Bookings List Endpoint Optimized: ${bookingsTime.toFixed(2)} ms (${bookings.length} records)`);

  console.log('\n================================================================');
}

runOptimizedBenchmark().catch(console.error).finally(() => prisma.$disconnect());
