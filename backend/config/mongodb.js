const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management';
const client = new MongoClient(uri);

let db = null;

async function connectMongo() {
  try {
    await client.connect();
    db = client.db();
    console.log('✅ MongoDB connected');
    return db;
  } catch (error) {
    console.error('⚠️ MongoDB not available. Install/start MongoDB and set MONGODB_URI:', error.message);
    return null;
  }
}

function getDb() {
  return db;
}

module.exports = { connectMongo, getDb };
