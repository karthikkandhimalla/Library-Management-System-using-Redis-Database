const { createClient } = require('redis');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({ url: redisUrl });

client.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

async function connectRedis() {
  try {
    await client.connect();
    console.log('✅ Redis connected at', redisUrl);
    return client;
  } catch (error) {
    console.error('⚠️ Redis not available. Starting in degraded mode:', error.message);
    return null;
  }
}

module.exports = { client, connectRedis };
