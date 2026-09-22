const express = require('express');
const router = express.Router();
const {
  seedCatalog,
  getAllBooks,
  getBookById,
  searchBooks,
  createBook,
  updateBook,
  updateInventory,
  deleteBook,
} = require('../services/mongoService');

function sendBookError(res, error, fallback) {
  return res.status(error.statusCode || 503).json({ message: error.message || fallback });
}

router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    const books = query ? await searchBooks(query) : await getAllBooks();
    res.json(books);
  } catch (error) {
    res.status(503).json({ message: error.message || 'Unable to load books.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    return res.json(book);
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Unable to load book details.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const book = await createBook(req.body);
    res.status(201).json(book);
  } catch (error) {
    sendBookError(res, error, 'Unable to create book.');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const book = await updateBook(req.params.id, req.body);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json(book);
  } catch (error) {
    sendBookError(res, error, 'Unable to update book.');
  }
});

router.patch('/:id/inventory', async (req, res) => {
  try {
    const book = await updateInventory(req.params.id, req.body.action, req.body.quantity);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    return res.json(book);
  } catch (error) {
    return sendBookError(res, error, 'Unable to update book inventory.');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteBook(req.params.id);
    res.json({ success: deleted, bookId: req.params.id });
  } catch (error) {
    sendBookError(res, error, 'Unable to delete book.');
  }
});

router.post('/seed', async (req, res) => {
  try {
    const books = await seedCatalog();
    res.json({ success: true, books });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Catalog seeding failed.' });
  }
});

module.exports = router;
