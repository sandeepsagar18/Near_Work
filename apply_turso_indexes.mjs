import { createClient } from '@libsql/client/web';

const tursoUrl = 'libsql://nearwork-db-nearwork.aws-ap-south-1.turso.io';
const tursoAuthToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMDQ0NjUsImlkIjoiMDFhMDFkYWYtZjAwMS03YzAyLTlkNTctZWNlMmExM2E4ZmE3Iiwia2lkIjoicnNLV3JGRXBCSUw5ZUtLNl9mY2lHelFrdy1jLXpud3NlVFBSc204ckNhVSIsInJpZCI6ImQ5MmZkOTgwLTZmOGQtNDk0Mi1hOGY0LWZkZjQ0NmY0MDViMiJ9.dkducrMTmaRdjbaegej6930ixn9oTir5k-JnHukOkbSrebnLANfSzDMvnzkT4gqYMClQyDfffKEqCuL784nNBA';

const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });

const indexStatements = [
  'CREATE INDEX IF NOT EXISTS idx_bookings_customerId ON Booking(customerId)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_workerId ON Booking(workerId)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_status ON Booking(status)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_createdAt ON Booking(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_addresses_userId ON Address(userId)',
  'CREATE INDEX IF NOT EXISTS idx_services_categoryId ON Service(categoryId)',
  'CREATE INDEX IF NOT EXISTS idx_services_isActive ON Service(isActive)',
  'CREATE INDEX IF NOT EXISTS idx_categories_isActive ON ServiceCategory(isActive)',
  'CREATE INDEX IF NOT EXISTS idx_categories_sortOrder ON ServiceCategory(sortOrder)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_userId ON Notification(userId)',
  'CREATE INDEX IF NOT EXISTS idx_chatMessages_chatId ON ChatMessage(chatId)',
  'CREATE INDEX IF NOT EXISTS idx_workerSkills_workerId ON WorkerSkill(workerId)',
  'CREATE INDEX IF NOT EXISTS idx_workerLocations_workerId ON WorkerLocation(workerId)'
];

async function applyIndexes() {
  console.log('🚀 Applying performance indexes to Turso Cloud Database...');
  for (const sql of indexStatements) {
    const start = performance.now();
    await client.execute(sql);
    console.log(`✓ ${sql} (${(performance.now() - start).toFixed(2)}ms)`);
  }
  console.log('✅ All indexes applied successfully to Turso DB!');
}

applyIndexes().catch(console.error);
