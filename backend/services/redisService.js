const { client } = require('../config/redis');

const SORTED_BY_VALIDITY = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
};

async function createLibrary() {
  await client.del('LIBRARY_BOOKS');
  await client.del('ISSUED_BOOKS');
  await client.del('WAITLIST:BOOK_ID');
  return 'Library Created';
}

async function addDefaultBooks() {
  const books = [
    'Clean Code',
    'Introduction to Algorithms',
    'Database System Concepts',
    'Operating System Concepts',
    'Computer Networks',
  ];

  await client.del('LIBRARY_BOOKS');
  for (const book of books) {
    await client.rPush('LIBRARY_BOOKS', book);
  }
  return 'Books Added';
}

async function insertAIBook() {
  await client.lInsert('LIBRARY_BOOKS', 'BEFORE', 'Database System Concepts', 'Artificial Intelligence: A Modern Approach');
  return 'Book Inserted';
}

async function getLibraryBooks() {
  return client.lRange('LIBRARY_BOOKS', 0, -1);
}

async function removeBook() {
  await client.lRem('LIBRARY_BOOKS', 1, 'Computer Networks');
  return 'Book Removed';
}

async function issueBook() {
  await client.lMove('LIBRARY_BOOKS', 'ISSUED_BOOKS', 'LEFT', 'LEFT');
  return 'Book Issued';
}

async function getIssuedBooks() {
  return client.lRange('ISSUED_BOOKS', 0, -1);
}

async function addReservation(bookId, studentId) {
  const queueKey = `WAITLIST:${bookId}`;
  await client.rPush(queueKey, studentId);
  return { queueKey, studentId };
}

async function getReservationQueue(bookId) {
  const queueKey = `WAITLIST:${bookId}`;
  const students = await client.lRange(queueKey, 0, -1);
  return students;
}

async function getStudentQueuePosition(bookId, studentId) {
  const queue = await getReservationQueue(bookId);
  const index = queue.indexOf(studentId);
  if (index === -1) return null;
  return index + 1;
}

async function popNextReservation(bookId) {
  const queueKey = `WAITLIST:${bookId}`;
  return client.lPop(queueKey);
}

async function markIssueInRedis(bookId, studentId, dueDate) {
  const key = `ACTIVE_ISSUE:${studentId}:${bookId}`;
  const payload = JSON.stringify({ bookId, studentId, dueDate, issuedAt: new Date().toISOString() });
  await client.set(key, payload);
  return payload;
}

async function getActiveIssuesForStudent(studentId) {
  const keys = await client.keys(`ACTIVE_ISSUE:${studentId}:*`);
  const results = [];
  for (const key of keys) {
    const value = await client.get(key);
    if (value) results.push(JSON.parse(value));
  }
  return results;
}

async function removeActiveIssue(studentId, bookId) {
  const key = `ACTIVE_ISSUE:${studentId}:${bookId}`;
  await client.del(key);
}

module.exports = {
  createLibrary,
  addDefaultBooks,
  insertAIBook,
  getLibraryBooks,
  removeBook,
  issueBook,
  getIssuedBooks,
  addReservation,
  getReservationQueue,
  getStudentQueuePosition,
  popNextReservation,
  markIssueInRedis,
  getActiveIssuesForStudent,
  removeActiveIssue,
  SORTED_BY_VALIDITY,
};
