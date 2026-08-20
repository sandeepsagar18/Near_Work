import { createClient } from '@libsql/client/web';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const tursoUrl = 'libsql://nearwork-db-nearwork.aws-ap-south-1.turso.io';
const tursoAuthToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMDQ0NjUsImlkIjoiMDFhMDFkYWYtZjAwMS03YzAyLTlkNTctZWNlMmExM2E4ZmE3Iiwia2lkIjoicnNLV3JGRXBCSUw5ZUtLNl9mY2lHelFrdy1jLXpud3NlVFBSc204ckNhVSIsInJpZCI6ImQ5MmZkOTgwLTZmOGQtNDk0Mi1hOGY0LWZkZjQ0NmY0MDViMiJ9.dkducrMTmaRdjbaegej6930ixn9oTir5k-JnHukOkbSrebnLANfSzDMvnzkT4gqYMClQyDfffKEqCuL784nNBA';

const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoAuthToken });
const prisma = new PrismaClient({ adapter });
const rawClient = createClient({ url: tursoUrl, authToken: tursoAuthToken });

async function benchmark() {
  console.log('=== BENCHMARKING TURSO CLOUD DATABASE (BASELINE) ===\n');

  // 1. Raw roundtrip ping
  const pingStart = performance.now();
  await rawClient.execute('SELECT 1');
  const pingTime = performance.now() - pingStart;
  console.log(`Turso Single Roundtrip Network Ping: ${pingTime.toFixed(2)} ms\n`);

  // 2. Login Flow
  const loginStart = performance.now();
  const user = await prisma.user.findUnique({
    where: { email: 'customer@nearwork.com' },
    include: { workerProfile: true, adminProfile: true }
  });
  const passStart = performance.now();
  const isMatch = await bcrypt.compare('password123', user.passwordHash);
  const passTime = performance.now() - passStart;
  const loginTotal = performance.now() - loginStart;
  console.log(`Login Endpoint Baseline: ${loginTotal.toFixed(2)} ms (DB fetch: ${(loginTotal - passTime).toFixed(2)} ms, bcrypt: ${passTime.toFixed(2)} ms)`);

  // 3. Services Fetch
  const servicesStart = performance.now();
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: { category: true }
  });
  const servicesTime = performance.now() - servicesStart;
  console.log(`Services Endpoint Baseline: ${servicesTime.toFixed(2)} ms (${services.length} records)`);

  // 4. Categories Fetch
  const catsStart = performance.now();
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  const catsTime = performance.now() - catsStart;
  console.log(`Categories Endpoint Baseline: ${catsTime.toFixed(2)} ms (${categories.length} records)`);

  // 5. Customer Profile (User + Addresses)
  const profileStart = performance.now();
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, avatarUrl: true,
      addresses: { orderBy: { isDefault: 'desc' } }
    }
  });
  const profileTime = performance.now() - profileStart;
  console.log(`Customer Profile Endpoint Baseline: ${profileTime.toFixed(2)} ms`);

  // 6. Bookings List
  const bookingsStart = performance.now();
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: {
      service: { include: { category: true } },
      address: true,
      worker: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
      payment: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  const bookingsTime = performance.now() - bookingsStart;
  console.log(`Bookings List Endpoint Baseline: ${bookingsTime.toFixed(2)} ms (${bookings.length} records)`);

  console.log('\n======================================================');
}

benchmark().catch(console.error).finally(() => prisma.$disconnect());
