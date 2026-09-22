const { client } = require('../config/cassandra');

async function ensureKeyspace() {
  try {
    const query = `CREATE KEYSPACE IF NOT EXISTS library_keyspace WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1};`;
    await client.execute(query);
    await client.execute(`USE library_keyspace;`);
    await client.execute(`CREATE TABLE IF NOT EXISTS borrowing_history (
      student_id text,
      book_id text,
      action text,
      timestamp text,
      due_date text,
      PRIMARY KEY ((student_id), timestamp, book_id)
    );`);
    return true;
  } catch (error) {
    console.error('Cassandra history table setup failed:', error.message);
    return false;
  }
}

async function logHistory(studentId, bookId, action, dueDate) {
  if (!client) return null;
  const timestamp = new Date().toISOString();
  const query = `INSERT INTO borrowing_history (student_id, book_id, action, timestamp, due_date) VALUES (?, ?, ?, ?, ?)`;
  await client.execute(query, [studentId, bookId, action, timestamp, dueDate || ''], { prepare: true });
  return { studentId, bookId, action, timestamp, dueDate };
}

async function getHistoryForStudent(studentId) {
  if (!client) return [];
  const query = `SELECT * FROM borrowing_history WHERE student_id = ? ORDER BY timestamp DESC LIMIT 50;`;
  const result = await client.execute(query, [studentId], { prepare: true });
  return result.rows;
}

module.exports = {
  ensureKeyspace,
  logHistory,
  getHistoryForStudent,
};
