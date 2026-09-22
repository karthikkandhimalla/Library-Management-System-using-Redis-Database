require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectRedis, client } = require('./config/redis');
const { connectMongo } = require('./config/mongodb');
const { connectCassandra } = require('./config/cassandra');
const { connectNeo4j } = require('./config/neo4j');
const { ensureKeyspace, getHistoryForStudent } = require('./services/cassandraService');
const { ensureGraphConstraints, seedGraphForDemo } = require('./services/neo4jService');
const { seedCatalog, getAllBooks, ensureDefaultStudent } = require('./services/mongoService');
const {
  addDefaultBooks,
  createLibrary,
  getLibraryBooks,
  getIssuedBooks,
  insertAIBook,
  issueBook,
  removeBook,
  addReservation,
  getReservationQueue,
  getStudentQueuePosition,
} = require('./services/redisService');

const booksRouter = require('./routes/books');
const studentsRouter = require('./routes/students');
const borrowRouter = require('./routes/borrow');
const reservationsRouter = require('./routes/reservations');
const recommendationsRouter = require('./routes/recommendations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/books', booksRouter);
app.use('/api/students', studentsRouter);
app.use('/api/borrow', borrowRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/recommendations', recommendationsRouter);

app.get('/api/dashboard', async (req, res) => {
  try {
    const books = await getAllBooks();
    const totalBooks = books.length;
    const availableBooks = books.filter((book) => book.availableCopies > 0).length;
    const issuedBooks = books.filter((book) => book.availableCopies < book.totalCopies).length;

    res.json({
      totalBooks,
      availableBooks,
      issuedBooks,
      overdueBooks: 0,
      activeReservations: 0,
      books,
    });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Dashboard unavailable.' });
  }
});

app.get('/api/history/:studentId', async (req, res) => {
  try {
    const history = await getHistoryForStudent(req.params.studentId);
    res.json(history);
  } catch (error) {
    res.status(503).json({ message: error.message || 'History unavailable.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    redis: !!client,
    mongo: !!process.env.MONGODB_URI,
    cassandra: !!process.env.CASSANDRA_CONTACT_POINTS,
    neo4j: !!process.env.NEO4J_URI,
  });
});

app.post('/create', async (req, res) => {
  try {
    const message = await createLibrary();
    res.send(message);
  } catch (error) {
    res.status(500).send(error.message || 'Redis library creation failed.');
  }
});

app.post('/addBooks', async (req, res) => {
  try {
    const message = await addDefaultBooks();
    res.send(message);
  } catch (error) {
    res.status(500).send(error.message || 'Unable to add default books.');
  }
});

app.post('/insertAI', async (req, res) => {
  try {
    const message = await insertAIBook();
    res.send(message);
  } catch (error) {
    res.status(500).send(error.message || 'Unable to insert AI book.');
  }
});

app.get('/books', async (req, res) => {
  try {
    const books = await getLibraryBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to read Redis library books.' });
  }
});

app.delete('/remove', async (req, res) => {
  try {
    const message = await removeBook();
    res.send(message);
  } catch (error) {
    res.status(500).send(error.message || 'Unable to remove book.');
  }
});

app.post('/issue', async (req, res) => {
  try {
    const message = await issueBook();
    res.send(message);
  } catch (error) {
    res.status(500).send(error.message || 'Unable to issue book.');
  }
});

app.get('/issued', async (req, res) => {
  try {
    const books = await getIssuedBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to read issued books.' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    const result = await addReservation(bookId, studentId);
    const position = await getStudentQueuePosition(bookId, studentId);
    res.json({ message: 'Reservation queued successfully.', studentId, bookId, position, result });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Reservation failed.' });
  }
});

app.get('/api/reservations/:bookId', async (req, res) => {
  try {
    const queue = await getReservationQueue(req.params.bookId);
    res.json({ bookId: req.params.bookId, queue });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch reservations.' });
  }
});

async function initializeServices() {
  await connectRedis();
  await connectMongo();
  await connectCassandra();
  await connectNeo4j();
  await ensureKeyspace();
  await ensureGraphConstraints();
  await seedCatalog();
  await ensureDefaultStudent();
  await seedGraphForDemo();
}

initializeServices().catch((error) => {
  console.error('Initialization error:', error.message);
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
  console.log('Redis lab endpoints remain available.');
});