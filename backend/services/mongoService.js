const { getDb } = require('../config/mongodb');

const BOOKS_COLLECTION = 'books';
const STUDENTS_COLLECTION = 'students';
const AUTHORS_COLLECTION = 'authors';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toPositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw validationError(`${fieldName} must be a positive integer.`);
  }
  return number;
}

function toBookDocument(payload, existing = {}) {
  const shelf = String(payload.shelf ?? payload.shelfLocation ?? existing.shelf ?? existing.shelfLocation ?? '').trim();
  const book = {
    bookId: String(payload.bookId ?? existing.bookId ?? '').trim(),
    title: String(payload.title ?? existing.title ?? '').trim(),
    author: String(payload.author ?? existing.author ?? '').trim(),
    category: String(payload.category ?? existing.category ?? '').trim(),
    shelf,
    description: String(payload.description ?? existing.description ?? '').trim(),
  };

  if (!book.bookId || !book.title || !book.author || !book.category || !book.shelf) {
    throw validationError('bookId, title, author, category, and shelf are required.');
  }

  return book;
}

function getCollection(name) {
  const db = getDb();
  if (!db) {
    throw new Error('MongoDB is not connected. Start MongoDB and configure MONGODB_URI.');
  }
  return db.collection(name);
}

async function seedCatalog() {
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const count = await booksCollection.countDocuments();
  if (count > 0) {
    const books = await booksCollection.find({}).toArray();
    for (const book of books) {
      const now = new Date().toISOString();
      const updates = {
        shelf: book.shelf || book.shelfLocation || 'Unassigned',
        createdAt: book.createdAt || now,
        updatedAt: book.updatedAt || now,
      };
      await booksCollection.updateOne({ _id: book._id }, { $set: updates });
    }
    return [];
  }

  const seedBooks = [
    {
      bookId: 'B001',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      category: 'Software Engineering',
      isbn: '9780132350884',
      totalCopies: 5,
      availableCopies: 4,
      shelf: 'QA-12',
      description: 'A handbook of agile software craftsmanship.',
    },
    {
      bookId: 'B002',
      title: 'Design Patterns',
      author: 'Erich Gamma',
      category: 'Software Engineering',
      isbn: '9780201633610',
      totalCopies: 4,
      availableCopies: 3,
      shelf: 'QA-08',
      description: 'Reusable object-oriented design patterns.',
    },
    {
      bookId: 'B003',
      title: 'Database System Concepts',
      author: 'Abraham Silberschatz',
      category: 'Databases',
      isbn: '9780073523323',
      totalCopies: 3,
      availableCopies: 2,
      shelf: 'DB-05',
      description: 'Foundation concepts for modern database systems.',
    },
    {
      bookId: 'B004',
      title: 'Artificial Intelligence: A Modern Approach',
      author: 'Stuart Russell',
      category: 'Artificial Intelligence',
      isbn: '9780136042594',
      totalCopies: 3,
      availableCopies: 2,
      shelf: 'AI-14',
      description: 'Core principles of artificial intelligence and machine learning.',
    },
    {
      bookId: 'B005',
      title: 'Computer Networks',
      author: 'Andrew S. Tanenbaum',
      category: 'Networking',
      isbn: '9780132126953',
      totalCopies: 4,
      availableCopies: 2,
      shelf: 'NET-09',
      description: 'Practical and theoretical networking principles.',
    },
  ];

  await booksCollection.insertMany(seedBooks);
  return seedBooks;
}

async function getAllBooks() {
  return getCollection(BOOKS_COLLECTION).find({}).toArray();
}

async function getBookById(bookId) {
  return getCollection(BOOKS_COLLECTION).findOne({ bookId });
}

async function searchBooks(query) {
  const normalized = query.trim();
  if (!normalized) return getAllBooks();

  const regex = new RegExp(normalized, 'i');
  return getCollection(BOOKS_COLLECTION).find({
    $or: [
      { title: regex },
      { author: regex },
      { category: regex },
      { bookId: regex },
    ],
  }).toArray();
}

async function createBook(payload) {
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const existing = await booksCollection.findOne({ bookId: String(payload.bookId || '').trim() });
  if (existing) {
    throw validationError(`Book ID ${payload.bookId} already exists.`, 409);
  }

  const book = toBookDocument(payload);
  const totalCopies = toPositiveInteger(payload.totalCopies, 'totalCopies');
  const now = new Date().toISOString();
  const document = {
    ...book,
    totalCopies,
    availableCopies: totalCopies,
    createdAt: now,
    updatedAt: now,
  };
  await booksCollection.insertOne(document);
  return document;
}

async function updateBook(bookId, payload) {
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const existing = await getBookById(bookId);
  if (!existing) return null;
  const editable = toBookDocument({ ...existing, ...payload, bookId });
  const result = await booksCollection.findOneAndUpdate(
    { bookId },
    { $set: { ...editable, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  return result?.value ?? result;
}

async function deleteBook(bookId) {
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const book = await getBookById(bookId);
  if (!book) return false;
  const borrowedCopies = Number(book.totalCopies || 0) - Number(book.availableCopies || 0);
  if (borrowedCopies > 0) {
    throw validationError('Cannot delete a book while copies are borrowed.');
  }
  const result = await booksCollection.deleteOne({ bookId });
  return result.deletedCount > 0;
}

async function borrowBook(bookId) {
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const updated = await booksCollection.findOneAndUpdate(
    { bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  const document = updated?.value ?? updated;
  if (document) return document;
  const book = await getBookById(bookId);
  if (!book) return null;
  return { status: 'unavailable' };
}

async function returnBook(bookId) {
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const updated = await booksCollection.findOneAndUpdate(
    { bookId, $expr: { $lt: ['$availableCopies', '$totalCopies'] } },
    { $inc: { availableCopies: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  const document = updated?.value ?? updated;
  if (document) return document;
  return getBookById(bookId);
}

async function updateInventory(bookId, action, quantity) {
  if (!['add', 'remove'].includes(action)) {
    throw validationError('Inventory action must be add or remove.');
  }
  const amount = toPositiveInteger(quantity, 'quantity');
  const booksCollection = getCollection(BOOKS_COLLECTION);
  const update = action === 'add'
    ? { $inc: { totalCopies: amount, availableCopies: amount } }
    : { $inc: { totalCopies: -amount, availableCopies: -amount } };
  const filter = action === 'add'
    ? { bookId }
    : { bookId, availableCopies: { $gte: amount } };
  update.$set = { updatedAt: new Date().toISOString() };

  const result = await booksCollection.findOneAndUpdate(filter, update, { returnDocument: 'after' });
  const document = result?.value ?? result;
  if (document) return document;

  const existing = await getBookById(bookId);
  if (!existing) return null;
  throw validationError(`Cannot remove ${amount} copies. Only ${existing.availableCopies} copies are currently available.`);
}

async function getStudent(studentId) {
  return getCollection(STUDENTS_COLLECTION).findOne({ studentId });
}

async function ensureDefaultStudent() {
  const studentsCollection = getCollection(STUDENTS_COLLECTION);
  const existing = await studentsCollection.findOne({ studentId: 'STU-1001' });

  if (!existing) {
    const student = {
      studentId: 'STU-1001',
      name: 'Aanya Sharma',
      email: 'aanya.sharma@college.edu',
      department: 'Computer Science',
      year: '3rd Year',
    };
    await studentsCollection.insertOne(student);
    return student;
  }

  return existing;
}

async function createStudent(student) {
  const studentsCollection = getCollection(STUDENTS_COLLECTION);
  const result = await studentsCollection.insertOne(student);
  return { ...student, _id: result.insertedId };
}

async function getAllStudents() {
  return getCollection(STUDENTS_COLLECTION).find({}).toArray();
}

async function createOrUpdateAuthor(authorName) {
  const authorsCollection = getCollection(AUTHORS_COLLECTION);
  const existing = await authorsCollection.findOne({ name: authorName });
  if (existing) return existing;
  const created = { name: authorName };
  await authorsCollection.insertOne(created);
  return created;
}

module.exports = {
  seedCatalog,
  getAllBooks,
  getBookById,
  searchBooks,
  createBook,
  updateBook,
  updateInventory,
  deleteBook,
  borrowBook,
  returnBook,
  getStudent,
  ensureDefaultStudent,
  createStudent,
  getAllStudents,
  createOrUpdateAuthor,
};
