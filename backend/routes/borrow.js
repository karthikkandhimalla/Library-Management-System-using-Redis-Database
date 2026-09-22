const express = require('express');
const router = express.Router();
const { borrowBook, returnBook, getBookById, getStudent } = require('../services/mongoService');
const { markIssueInRedis, removeActiveIssue, getActiveIssuesForStudent, getReservationQueue, popNextReservation } = require('../services/redisService');
const { logHistory } = require('../services/cassandraService');
const { borrowRelationship, returnRelationship } = require('../services/neo4jService');

function calculateDueDate(daysFromNow = 14) {
  const due = new Date();
  due.setDate(due.getDate() + daysFromNow);
  return due.toISOString();
}

router.get('/student/:studentId', async (req, res) => {
  try {
    const issues = await getActiveIssuesForStudent(req.params.studentId);
    return res.json(issues);
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Unable to load active borrowed books.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    const book = await getBookById(bookId);
    const student = await getStudent(studentId);

    if (!book) return res.status(404).json({ message: 'Book not found.' });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const updatedBook = await borrowBook(bookId);
    if (!updatedBook || updatedBook.status === 'unavailable') {
      return res.status(400).json({ message: 'Book is not available for borrowing.' });
    }

    const dueDate = calculateDueDate();
    await markIssueInRedis(bookId, studentId, dueDate);
    await logHistory(studentId, bookId, 'BORROW', dueDate);
    await borrowRelationship(studentId, bookId);

    res.json({
      message: 'Book borrowed successfully.',
      studentId,
      bookId,
      title: book.title,
      issueDate: new Date().toISOString(),
      dueDate,
      status: 'ACTIVE',
      totalCopies: updatedBook.totalCopies,
      availableCopies: updatedBook.availableCopies,
      borrowedCopies: updatedBook.totalCopies - updatedBook.availableCopies,
    });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Borrowing failed.' });
  }
});

router.post('/return', async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    const book = await getBookById(bookId);

    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const updatedBook = await returnBook(bookId);
    await removeActiveIssue(studentId, bookId);
    await logHistory(studentId, bookId, 'RETURN', new Date().toISOString());
    await returnRelationship(studentId, bookId);

    const queue = await getReservationQueue(bookId);
    let queueMessage = 'Book returned successfully.';
    if (queue && queue.length > 0) {
      const nextStudent = await popNextReservation(bookId);
      queueMessage = `Book is now available for the next student in the reservation queue.`;
      if (nextStudent) {
        queueMessage += ` Next student: ${nextStudent}`;
      }
    }

    res.json({
      message: queueMessage,
      studentId,
      bookId,
      title: book.title,
      status: 'RETURNED',
      totalCopies: updatedBook?.totalCopies,
      availableCopies: updatedBook?.availableCopies,
      borrowedCopies: updatedBook ? updatedBook.totalCopies - updatedBook.availableCopies : undefined,
      updatedBook,
    });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Return failed.' });
  }
});

module.exports = router;
