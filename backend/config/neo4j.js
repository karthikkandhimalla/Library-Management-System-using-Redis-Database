const neo4j = require('neo4j-driver');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const username = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'change_this_password';

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

async function connectNeo4j() {
  try {
    const session = driver.session();
    await session.run('RETURN 1 AS ok');
    await session.close();
    console.log('✅ Neo4j connected');
    return driver;
  } catch (error) {
    console.error('⚠️ Neo4j not available. Start Neo4j and set NEO4J credentials:', error.message);
    return null;
  }
}

module.exports = { driver, connectNeo4j };
