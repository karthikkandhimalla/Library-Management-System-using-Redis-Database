const cassandra = require('cassandra-driver');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(',').map((point) => point.trim());
const keyspace = process.env.CASSANDRA_KEYSPACE || 'library_keyspace';

const client = new cassandra.Client({
  contactPoints,
  localDataCenter: 'datacenter1',
  keyspace,
  socketOptions: {
    connectTimeout: 2000,
    readTimeout: 3000,
  },
});

async function connectCassandra() {
  try {
    await client.connect();
    console.log('✅ Cassandra connected');
    return client;
  } catch (error) {
    console.error('⚠️ Cassandra not available. Start Cassandra and set CASSANDRA_CONTACT_POINTS:', error.message);
    return null;
  }
}

module.exports = { client, connectCassandra, keyspace };
