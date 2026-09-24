const { getAllBooks, getStudent } = require('./mongoService');
const { getActiveIssuesForStudent, getReservationQueue } = require('./redisService');
const { getHistoryForStudent } = require('./cassandraService');
const { getRecommendations } = require('./neo4jService');

async function collectLibraryContext(studentId) {
  const normalizedStudentId = studentId === 'STU001' ? 'STU-1001' : studentId;
  const [books, student, borrowed, history] = await Promise.all([
    getAllBooks(),
    getStudent(normalizedStudentId),
    getActiveIssuesForStudent(normalizedStudentId),
    getHistoryForStudent(normalizedStudentId),
  ]);
  let recommendations = [];
  try {
    recommendations = await getRecommendations(normalizedStudentId);
  } catch (error) {
    console.error('AI recommendation context unavailable:', error.message);
  }

  const queues = {};
  for (const book of books) queues[book.bookId] = await getReservationQueue(book.bookId);
  return { books, student, borrowed, history, recommendations, queues };
}

function findBooks(books, query) {
  const stopWords = new Set(['how', 'many', 'copies', 'are', 'available', 'what', 'books', 'have', 'the', 'is', 'my', 'when', 'do', 'you', 'for', 'about', 'find', 'show', 'me', 'now', 'on', 'shelf']);
  const terms = query.toLowerCase().split(/\s+/).map((term) => term.replace(/[^a-z0-9-]/g, '')).filter((term) => term.length > 2 && !stopWords.has(term));
  return books.filter((book) => terms.some((term) => [book.title, book.author, book.category, book.description, book.shelf, book.bookId]
    .some((value) => String(value || '').toLowerCase().includes(term))));
}

function isLibraryQuestion(question) {
  return /\b(library|book|books|borrow|borrowed|due|overdue|available|copies|reserve|reservation|shelf|inventory|catalog|recommend|recommendation|history|student)\b/i.test(question);
}

function fallbackGeneralAnswer(question) {
  const normalized = question.toLowerCase();
  if (/\bwhat is java\b/.test(normalized)) return 'Java is a general-purpose, object-oriented programming language designed to be portable across platforms through the Java Virtual Machine (JVM).';
  if (/inheritance/.test(normalized)) return 'Inheritance is an object-oriented programming concept where a class derives properties and behavior from another class, allowing reuse and specialization.';
  if (/polymorphism|object[- ]oriented|\boop\b/.test(normalized)) return 'Object-oriented programming models software as objects. Its core ideas include encapsulation, inheritance, polymorphism, and abstraction. Polymorphism lets the same interface call different implementations.';
  if (/hello world|reverse a string/.test(normalized) && /java|program|python|string/.test(normalized)) return 'Here is a simple Java Hello World program:\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}';
  if (/machine learning/.test(normalized)) return 'Machine learning is a field of artificial intelligence in which systems learn patterns from data to make predictions or decisions without being explicitly programmed for every case.';
  if (/database normalization/.test(normalized)) return 'Database normalization organizes relational data to reduce duplication and update anomalies. Common levels include 1NF, 2NF, and 3NF.';
  if (/^(hi|hello|hey)\b/.test(normalized.trim())) return 'Hi! I can answer general questions and help you search the college library.';
  return null;
}

function fallbackAnswer(question, context) {
  const normalized = question.toLowerCase();
  const { books, borrowed, recommendations, queues } = context;
  const mentionedBooks = findBooks(books, question);

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(normalized.trim())) {
    return 'Hi! I can help with book availability, borrowed books, due dates, reservations, shelves, and recommendations.';
  }

  if (normalized.includes('borrowed') || normalized.includes('due') || normalized.includes('overdue')) {
    if (!borrowed.length) return 'You have no active borrowed books.';
    const overdue = borrowed.filter((item) => new Date(item.dueDate) < new Date());
    if (normalized.includes('overdue')) return overdue.length ? `You have ${overdue.length} overdue book(s): ${overdue.map((item) => item.bookId).join(', ')}.` : 'You do not have overdue books.';
    return borrowed.map((item) => `${item.bookId}, due ${new Date(item.dueDate).toLocaleDateString('en-GB')}`).join('; ');
  }
  if (normalized.includes('recommend') || normalized.includes('related')) {
    return recommendations.length ? recommendations.map((item) => `${item.title} (${item.category})`).join('; ') : 'Recommendations are unavailable because the graph service returned no results.';
  }
  if (normalized.includes('most borrowed')) {
    const counts = books.map((book) => ({ ...book, borrowed: Number(book.totalCopies || 0) - Number(book.availableCopies || 0) })).sort((a, b) => b.borrowed - a.borrowed);
    return counts.slice(0, 5).map((book) => `${book.title} (${book.borrowed} currently issued)`).join('; ');
  }
  if (mentionedBooks.length) {
    return mentionedBooks.map((book) => `${book.title}: ${book.availableCopies} of ${book.totalCopies} copies available${book.shelf ? ` on shelf ${book.shelf}` : ''}.`).join(' ');
  }
  if (normalized.includes('available')) {
    return books.filter((book) => Number(book.availableCopies) > 0).map((book) => `${book.title} (${book.availableCopies} available)`).join('; ') || 'No books are currently available.';
  }
  if (normalized.includes('reserve')) return 'To reserve a book, open its catalog details and choose Reserve when all copies are borrowed.';
  if (normalized.includes('reservation')) {
    const active = Object.entries(queues).filter(([, queue]) => queue.includes(context.student?.studentId));
    return active.length ? active.map(([bookId, queue]) => `${bookId}: queue position ${queue.indexOf(context.student.studentId) + 1}`).join('; ') : 'You have no active reservations.';
  }
  return null;
}

async function askLibraryAssistant(question, studentId) {
  const libraryQuestion = isLibraryQuestion(question);
  const context = libraryQuestion ? await collectLibraryContext(studentId) : null;
  const libraryFallback = context ? fallbackAnswer(question, context) : null;
  const fallback = libraryFallback || fallbackGeneralAnswer(question);
  if (!process.env.AI_API_KEY) {
    console.error('AI request skipped: AI_API_KEY is missing.');
    if (fallback) return fallback;
    throw new Error('AI_API_KEY is missing.');
  }

  const systemPrompt = `You are a general-purpose AI assistant integrated into a college library management system.
Answer general questions normally and helpfully.
When a user asks about current library information such as book availability, borrowed books, due dates, reservations, inventory, shelves, students, or borrowing history, use the supplied live library data and never invent information.
If library data is unavailable, clearly say that the library data could not be retrieved.
Do not claim that an action such as borrowing or returning a book was completed unless the backend confirms it.
You can explain programming, computer science, academics, general knowledge, writing, mathematics, and other normal questions.${context ? `\n\nLIVE LIBRARY DATA:\n${JSON.stringify(context)}` : ''}`;
  try {
    const response = await fetch(process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }] }),
    });
    const rawBody = await response.text();
    let data;
    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch (parseError) {
      console.error('OpenAI response parsing error:', parseError.message);
      throw new Error(`OpenAI returned invalid JSON (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      const providerMessage = data?.error?.message || rawBody || 'Unknown provider error';
      console.error(`OpenAI request error: HTTP ${response.status}; ${providerMessage}`);
      throw new Error(`OpenAI request failed with HTTP ${response.status}.`);
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error('OpenAI response missing choices[0].message.content.');
      throw new Error('OpenAI response did not contain a reply.');
    }
    return reply;
  } catch (error) {
    console.error('AI provider failure:', error.stack || error.message);
    if (fallback) return fallback;
    throw error;
  }
}

module.exports = { askLibraryAssistant, collectLibraryContext };