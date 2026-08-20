import dns from 'dns';
import { MongoClient } from 'mongodb';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://sandeepk:Sandeep%404484@jokecluster.bvdzkx9.mongodb.net/nearwork?retryWrites=true&w=majority&appName=Jokecluster';

async function getStats() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('nearwork');
    const stats = await db.command({ dbStats: 1 });
    
    console.log('\n--- 📊 NEARWORK MONGODB STATS ---');
    console.log(`Database Name: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Total Documents: ${stats.objects}`);
    console.log(`Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log(`Index Size: ${(stats.indexSize / 1024).toFixed(2)} KB`);
    console.log(`Total Allocated: ${((stats.storageSize + stats.indexSize) / 1024 / 1024).toFixed(3)} MB`);
    console.log(`Free Tier Quota: 512.00 MB`);
    const usedPercent = (((stats.storageSize + stats.indexSize) / (512 * 1024 * 1024)) * 100).toFixed(4);
    console.log(`Storage Used: ${usedPercent}%`);
    console.log('--------------------------------\n');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

getStats();
