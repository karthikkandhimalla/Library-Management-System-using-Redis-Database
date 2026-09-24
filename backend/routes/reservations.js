const express = require('express');
const router = express.Router();
const { addReservation, getReservationQueue, getStudentQueuePosition } = require('../services/redisService');
const { getBookById, getStudent } = require('../services/mongoService');
const { sendReservationConfirmation } = require('../services/emailService');

router.post('/', async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    const result = await addReservation(bookId, studentId);
    const position = await getStudentQueuePosition(bookId, studentId);
    const [book, student] = await Promise.all([getBookById(bookId), getStudent(studentId)]);
    const email = await sendReservationConfirmation(student, book || { bookId, title: bookId }, position);
    res.json({
      message: 'Reservation added to the queue.',
      studentId,
      bookId,
      position,
      queue: result,
      email,
    });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Reservation failed.' });
  }
});

router.get('/:bookId', async (req, res) => {
  try {
    const queue = await getReservationQueue(req.params.bookId);
    res.json({ bookId: req.params.bookId, queue });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Unable to fetch reservation queue.' });
  }
});

module.exports = router;
