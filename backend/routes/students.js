const express = require('express');
const router = express.Router();
const { getStudent, createStudent, getAllStudents } = require('../services/mongoService');

router.get('/', async (req, res) => {
  try {
    const students = await getAllStudents();
    res.json(students);
  } catch (error) {
    res.status(503).json({ message: error.message || 'Unable to load students.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await getStudent(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    return res.json(student);
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Unable to load student profile.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const student = await createStudent(req.body);
    res.status(201).json(student);
  } catch (error) {
    res.status(503).json({ message: error.message || 'Unable to create student.' });
  }
});

module.exports = router;
