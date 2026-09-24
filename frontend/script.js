const BASE_URL = 'http://localhost:3000';

const state = {
  books: [],
  studentId: 'STU-1001',
  activeSection: 'dashboard',
  selectedBookId: null,
  librarianBooks: [],
  inventoryAction: 'add',
};

function showToast({ type = 'info', title = 'Library update', message = '', duration = 5000 }) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✓', error: '!', warning: '!', info: 'i' };
  const toast = document.createElement('article');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><div class="toast-copy"><strong>${title}</strong><span>${message}</span></div><button class="toast-close" type="button" aria-label="Close notification">×</button>`;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('toast-leaving');
    window.setTimeout(() => toast.remove(), 250);
  }, duration);
}

function notify(message, isError = false) {
  showToast({ type: isError ? 'error' : 'success', title: isError ? 'Request failed' : 'Library update', message });
}

function showSection(sectionName) {
  state.activeSection = sectionName;

  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.target === sectionName;
    button.classList.toggle('active', active);
  });

  document.querySelectorAll('.page-section').forEach((section) => {
    const shouldShow = section.dataset.page === sectionName;
    section.classList.toggle('hidden-section', !shouldShow);
  });
}

function bindSectionNavigation() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      if (target) {
        showSection(target);
      }
    });
  });
}

function hideModal() {
  const modal = document.getElementById('bookDetailsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function closeLibrarianModal() {
  ['librarianModal', 'inventoryModal'].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  });
}

function openLibrarianBookModal(book = null) {
  const modal = document.getElementById('librarianModal');
  const form = document.getElementById('librarianBookForm');
  if (!modal || !form) return;

  form.reset();
  form.dataset.bookId = book?.bookId || '';
  document.getElementById('librarianModalTitle').textContent = book ? 'Edit Book' : 'Add New Book';
  form.elements.bookId.value = book?.bookId || '';
  form.elements.title.value = book?.title || '';
  form.elements.author.value = book?.author || '';
  form.elements.category.value = book?.category || '';
  form.elements.shelf.value = book?.shelf || book?.shelfLocation || '';
  form.elements.description.value = book?.description || '';
  form.elements.totalCopies.value = book?.totalCopies || '';
  form.elements.bookId.disabled = Boolean(book);
  form.elements.totalCopies.disabled = Boolean(book);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function openInventoryModal(bookId, action) {
  const book = state.librarianBooks.find((item) => item.bookId === bookId);
  const modal = document.getElementById('inventoryModal');
  const form = document.getElementById('inventoryForm');
  if (!book || !modal || !form) return;

  state.selectedBookId = bookId;
  state.inventoryAction = action;
  form.reset();
  document.getElementById('inventoryModalTitle').textContent = action === 'add' ? 'Add Copies' : 'Remove Copies';
  document.getElementById('inventoryModalSummary').textContent = `${book.title}: ${book.totalCopies} total, ${book.availableCopies} available, ${book.totalCopies - book.availableCopies} borrowed.`;
  form.querySelector('button').textContent = action === 'add' ? 'Add Copies' : 'Remove Copies';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function renderLibrarianStats(books, activeReservations) {
  const totalCopies = books.reduce((sum, book) => sum + Number(book.totalCopies || 0), 0);
  const availableCopies = books.reduce((sum, book) => sum + Number(book.availableCopies || 0), 0);
  const stats = [
    ['Total Unique Books', books.length],
    ['Total Copies', totalCopies],
    ['Available Copies', availableCopies],
    ['Borrowed Copies', totalCopies - availableCopies],
    ['Active Reservations', activeReservations],
  ];
  document.getElementById('librarianStats').innerHTML = stats.map(([label, value]) => `
    <div class="librarian-stat"><span>${label}</span><strong>${value}</strong></div>
  `).join('');
}

function renderLibrarianBooks() {
  const search = (document.getElementById('librarianSearch')?.value || '').trim().toLowerCase();
  const category = document.getElementById('librarianCategory')?.value || '';
  const books = state.librarianBooks.filter((book) => {
    const matchesSearch = !search || [book.bookId, book.title, book.author].some((value) => String(value || '').toLowerCase().includes(search));
    return matchesSearch && (!category || book.category === category);
  });
  const body = document.getElementById('librarianBooksBody');
  const empty = document.getElementById('librarianEmpty');
  if (!books.length) {
    body.innerHTML = '';
    empty.classList.remove('hidden-section');
    return;
  }
  empty.classList.add('hidden-section');
  body.innerHTML = books.map((book) => {
    const total = Number(book.totalCopies || 0);
    const available = Number(book.availableCopies || 0);
    const borrowed = total - available;
    const status = available > 0 ? 'Available' : 'Borrowed Out';
    return `
      <tr>
        <td>${book.bookId}</td><td>${book.title}</td><td>${book.author}</td>
        <td>${book.category}</td><td>${book.shelf || book.shelfLocation || 'N/A'}</td>
        <td>${total}</td><td>${available}</td><td>${borrowed}</td>
        <td class="table-status ${available > 0 ? '' : 'unavailable'}">${status}</td>
        <td><div class="table-actions">
          <button class="edit" data-librarian-edit="${book.bookId}">Edit</button>
          <button class="inventory" data-librarian-add="${book.bookId}">Add Copies</button>
          <button class="inventory" data-librarian-remove="${book.bookId}">Remove Copies</button>
          <button class="delete" data-librarian-delete="${book.bookId}">Delete</button>
        </div></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('[data-librarian-edit]').forEach((button) => button.addEventListener('click', () => {
    const book = state.librarianBooks.find((item) => item.bookId === button.dataset.librarianEdit);
    openLibrarianBookModal(book);
  }));
  document.querySelectorAll('[data-librarian-add]').forEach((button) => button.addEventListener('click', () => openInventoryModal(button.dataset.librarianAdd, 'add')));
  document.querySelectorAll('[data-librarian-remove]').forEach((button) => button.addEventListener('click', () => openInventoryModal(button.dataset.librarianRemove, 'remove')));
  document.querySelectorAll('[data-librarian-delete]').forEach((button) => button.addEventListener('click', () => deleteLibrarianBook(button.dataset.librarianDelete)));
}

async function loadLibrarianPanel() {
  try {
    const books = await fetchJson(`${BASE_URL}/api/books`);
    state.librarianBooks = books || [];
    const queues = await Promise.all(state.librarianBooks.map(async (book) => {
      const response = await fetchJson(`${BASE_URL}/api/reservations/${book.bookId}`);
      return response.queue || [];
    }));
    renderLibrarianStats(state.librarianBooks, queues.reduce((sum, queue) => sum + queue.length, 0));
    const categories = [...new Set(state.librarianBooks.map((book) => book.category).filter(Boolean))].sort();
    const categorySelect = document.getElementById('librarianCategory');
    const selectedCategory = categorySelect.value;
    categorySelect.innerHTML = '<option value="">All categories</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join('');
    categorySelect.value = categories.includes(selectedCategory) ? selectedCategory : '';
    renderLibrarianBooks();
    await loadEmailStatus();
  } catch (error) {
    notify(error.message, true);
  }
}

async function loadEmailStatus() {
  const status = document.getElementById('emailStatus');
  const lastEmail = document.getElementById('lastEmail');
  if (!status || !lastEmail) return;
  try {
    const result = await fetchJson(`${BASE_URL}/api/email/status`);
    status.textContent = result.connected ? 'Connected' : 'Not configured';
    status.className = `badge ${result.connected ? 'success' : 'warning'}`;
    const email = result.lastEmail;
    lastEmail.textContent = email
      ? `${email.recipient} | ${email.subject} | ${new Date(email.timestamp).toLocaleString()} | ${email.status}`
      : 'No email attempts yet.';
  } catch (error) {
    status.textContent = 'Unavailable';
    status.className = 'badge danger';
    lastEmail.textContent = error.message;
  }
}

function addAssistantMessage(content, role = 'assistant') {
  const messages = document.getElementById('aiMessages');
  if (!messages) return;
  const message = document.createElement('div');
  message.className = `ai-message ${role}`;
  message.textContent = content;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

async function askAssistant(question) {
  if (!question.trim()) return;
  addAssistantMessage(question, 'user');
  const input = document.getElementById('aiInput');
  const button = document.getElementById('aiSend');
  input.value = '';
  button.disabled = true;
  try {
    const result = await fetchJson(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, studentId: 'STU001' }),
    });
    addAssistantMessage(result.reply);
  } catch (error) {
    addAssistantMessage(error.message || 'AI assistant is temporarily unavailable.');
  } finally {
    button.disabled = false;
    input.focus();
  }
}

async function deleteLibrarianBook(bookId) {
  const book = state.librarianBooks.find((item) => item.bookId === bookId);
  if (!book) return;
  showToast({ type: 'warning', title: 'Deleting book', message: `${book.title} will be removed if no copies are borrowed.` });
  try {
    await fetchJson(`${BASE_URL}/api/books/${encodeURIComponent(bookId)}`, { method: 'DELETE' });
    notify('Book deleted successfully.');
    await loadDashboard();
    await loadLibrarianPanel();
  } catch (error) {
    notify(error.message, true);
  }
}

function showBookModal(book) {
  const modal = document.getElementById('bookDetailsModal');
  if (!modal || !book) return;

  state.selectedBookId = book.bookId;
  document.getElementById('bookDetailsTitle').textContent = book.title || 'Book Details';
  document.getElementById('detailAuthor').textContent = book.author || 'N/A';
  document.getElementById('detailCategory').textContent = book.category || 'N/A';
  document.getElementById('detailShelf').textContent = book.shelfLocation || 'N/A';
  document.getElementById('detailAvailability').textContent = `${book.availableCopies ?? 0}/${book.totalCopies ?? 0}`;
  document.getElementById('detailIsbn').textContent = book.isbn || 'N/A';
  document.getElementById('detailBookId').textContent = book.bookId || 'N/A';
  document.getElementById('detailDescription').textContent = book.description || 'No description available.';

  const qrTarget = `${book.bookId}|${book.title}|${state.studentId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrTarget)}`;
  document.getElementById('bookQrCode').src = qrUrl;

  const borrowBtn = document.getElementById('modalBorrowBtn');
  const reserveBtn = document.getElementById('modalReserveBtn');
  borrowBtn.onclick = () => borrowBook(book.bookId, true);
  reserveBtn.onclick = () => reserveBook(book.bookId, true);

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function setRedisOutput(text) {
  const output = document.getElementById('redisOutput');
  if (output) output.textContent = text;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }

  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : (data && (data.message || data.reply)) || 'Request failed.');
  }

  return data;
}

function renderStats(stats) {
  const cards = [
    { label: 'Total Books', value: stats.totalBooks ?? 0 },
    { label: 'Available Books', value: stats.availableBooks ?? 0 },
    { label: 'Issued Books', value: stats.issuedBooks ?? 0 },
    { label: 'Overdue Books', value: stats.overdueBooks ?? 0 },
    { label: 'Active Reservations', value: stats.activeReservations ?? 0 },
  ];

  document.getElementById('statsGrid').innerHTML = cards.map((card) => `
    <div class="stat-card">
      <div class="label">${card.label}</div>
      <div class="value">${card.value}</div>
    </div>
  `).join('');
}

function renderBooks(books) {
  state.books = books;
  const bookCatalog = document.getElementById('bookCatalog');

  if (!books.length) {
    bookCatalog.innerHTML = '<div class="empty-state">No books available in the catalog.</div>';
    return;
  }

  bookCatalog.innerHTML = books.map((book) => {
    const available = Number(book.availableCopies ?? 0);
    const total = Number(book.totalCopies ?? 0);
    const borrowed = total - available;
    const status = available > 0 ? 'Available' : 'Borrowed Out';
    const statusClass = available > 0 ? '' : 'low';
    const borrowButton = available > 0
      ? `<button class="secondary" data-borrow="${book.bookId}">Borrow</button>`
      : '<button class="secondary" disabled>Unavailable</button>';

    return `
      <article class="book-card">
        <div class="cover">${(book.title || 'Book').slice(0, 2).toUpperCase()}</div>
        <h4>${book.title}</h4>
        <div class="meta">${book.author}</div>
        <div class="meta">${book.category}</div>
        <div class="availability">
          <span>${status}</span>
          <span class="status-badge ${statusClass}">${available}/${total}</span>
        </div>
        <div class="meta">Total: ${total} | Available: ${available} | Borrowed: ${borrowed}</div>
        <div class="meta">Shelf: ${book.shelf || book.shelfLocation || 'N/A'}</div>
        <div class="meta">Book ID: ${book.bookId}</div>
        <div class="book-actions">
          <button class="ghost" data-view="${book.bookId}">View Details</button>
          ${borrowButton}
          <button class="reserve" data-reserve="${book.bookId}">Reserve</button>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('[data-borrow]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookId = button.getAttribute('data-borrow');
      await borrowBook(bookId);
    });
  });

  document.querySelectorAll('[data-reserve]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookId = button.getAttribute('data-reserve');
      await reserveBook(bookId);
    });
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookId = button.getAttribute('data-view');
      const book = books.find((item) => item.bookId === bookId);
      if (!book) return;
      showBookModal(book);
    });
  });
}

function renderBorrowed(items) {
  const list = document.getElementById('borrowedList');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No active borrowed books.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="list-item">
      <strong>${item.bookId}</strong>
      <div>Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not set'}</div>
      <div>Status: ${item.status || 'ACTIVE'}</div>
      <div class="book-actions" style="margin-top: 10px;">
        <button class="secondary" data-return-book="${item.bookId}">Return</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('[data-return-book]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookId = button.getAttribute('data-return-book');
      await returnBookAction(bookId);
    });
  });
}

function renderReservations(items) {
  const list = document.getElementById('reservationList');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No active reservations.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="list-item">
      <strong>Book: ${item.bookId}</strong>
      <div>Student: ${item.studentId}</div>
      <div>Queue position: ${item.position || 1}</div>
    </div>
  `).join('');
}

function renderRecommendations(items) {
  const list = document.getElementById('recommendationsList');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No recommendations yet.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="list-item">
      <strong>${item.title}</strong>
      <div>${item.category}</div>
      <div>Recommended because it matches your borrowing pattern.</div>
    </div>
  `).join('');
}

function renderHistory(items) {
  const list = document.getElementById('historyList');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No borrowing history for this student.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="list-item">
      <strong>${item.action}</strong>
      <div>Book: ${item.book_id}</div>
      <div>${new Date(item.timestamp).toLocaleString()}</div>
    </div>
  `).join('');
}

function renderProfile(student) {
  const profileCard = document.getElementById('profileCard');
  if (!student) {
    profileCard.innerHTML = '<div class="empty-state">Student profile unavailable.</div>';
    return;
  }

  profileCard.innerHTML = `
    <div class="row"><span>Student ID</span><strong>${student.studentId}</strong></div>
    <div class="row"><span>Name</span><strong>${student.name}</strong></div>
    <div class="row"><span>Email</span><strong>${student.email}</strong></div>
    <div class="row"><span>Department</span><strong>${student.department}</strong></div>
    <div class="row"><span>Year</span><strong>${student.year}</strong></div>
  `;
}

async function loadDashboard() {
  try {
    const stats = await fetchJson(`${BASE_URL}/api/dashboard`);
    renderStats(stats);
    renderBooks(stats.books || []);
  } catch (error) {
    console.error(error);
    setRedisOutput(error.message);
  }

  try {
    const profile = await fetchJson(`${BASE_URL}/api/students/${state.studentId}`);
    renderProfile(profile);
  } catch (error) {
    renderProfile(null);
  }

  try {
    const history = await fetchJson(`${BASE_URL}/api/history/${state.studentId}`);
    renderHistory(history || []);
  } catch (error) {
    renderHistory([]);
  }

  try {
    const recommendations = await fetchJson(`${BASE_URL}/api/recommendations/${state.studentId}`);
    renderRecommendations(recommendations.recommendations || []);
  } catch (error) {
    renderRecommendations([]);
  }

  try {
    const allBooks = await fetchJson(`${BASE_URL}/api/books`);
    const queueBookId = (allBooks && allBooks[0] && allBooks[0].bookId) || 'B001';
    const response = await fetchJson(`${BASE_URL}/api/reservations/${queueBookId}`);
    renderReservations((response.queue || []).map((id, index) => ({ studentId: id, bookId: queueBookId, position: index + 1 })));
  } catch (error) {
    renderReservations([]);
  }

  try {
    const activeIssues = await fetchJson(`${BASE_URL}/api/borrow/student/${state.studentId}`);
    renderBorrowed(activeIssues || []);
  } catch (error) {
    renderBorrowed([]);
  }

  await loadLibrarianPanel();
}

async function borrowBook(bookId, suppressAlert = false) {
  try {
    const result = await fetchJson(`${BASE_URL}/api/borrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: state.studentId, bookId }),
    });
    if (!suppressAlert) {
      showToast({ type: 'success', title: 'Book Borrowed Successfully', message: `${result.title}\nDue date: ${new Date(result.dueDate).toLocaleDateString('en-GB')}` });
      if (result.email && !result.email.sent) showToast({ type: 'warning', title: 'Email notification could not be sent', message: result.email.error });
    }
    if (document.getElementById('bookDetailsModal')) {
      hideModal();
    }
    await loadDashboard();
  } catch (error) {
    showToast({ type: 'error', title: 'Borrowing failed', message: error.message });
  }
}

async function reserveBook(bookId, suppressAlert = false) {
  try {
    const result = await fetchJson(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: state.studentId, bookId }),
    });
    if (!suppressAlert) {
      showToast({ type: 'success', title: 'Reservation Successful', message: `You have been added to the waiting queue at position #${result.position || 1}.` });
      if (result.email && !result.email.sent) showToast({ type: 'warning', title: 'Email notification could not be sent', message: result.email.error });
    }
    if (document.getElementById('bookDetailsModal')) {
      hideModal();
    }
    await loadDashboard();
  } catch (error) {
    showToast({ type: 'error', title: 'Reservation failed', message: error.message });
  }
}

async function returnBookAction(bookId, suppressAlert = false) {
  try {
    const result = await fetchJson(`${BASE_URL}/api/borrow/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: state.studentId, bookId }),
    });
    if (!suppressAlert) {
      showToast({ type: 'success', title: 'Book Returned', message: `${result.title || bookId} has been successfully returned.` });
      if (result.email && !result.email.sent) showToast({ type: 'warning', title: 'Email notification could not be sent', message: result.email.error });
    }
    await loadDashboard();
  } catch (error) {
    showToast({ type: 'error', title: 'Return failed', message: error.message });
  }
}

async function triggerRedisAction(action) {
  const actions = {
    create: { url: `${BASE_URL}/create`, method: 'POST' },
    add: { url: `${BASE_URL}/addBooks`, method: 'POST' },
    insert: { url: `${BASE_URL}/insertAI`, method: 'POST' },
    show: { url: `${BASE_URL}/books`, method: 'GET' },
    remove: { url: `${BASE_URL}/remove`, method: 'DELETE' },
    issue: { url: `${BASE_URL}/issue`, method: 'POST' },
    issued: { url: `${BASE_URL}/issued`, method: 'GET' },
  };

  const operation = actions[action];
  if (!operation) return;

  try {
    const response = await fetch(operation.url, { method: operation.method });
    const result = await response.json().catch(async () => await response.text());
    const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    setRedisOutput(output);
    if (action === 'show' || action === 'issued') {
      const books = Array.isArray(result) ? result : [];
      setRedisOutput(JSON.stringify(books, null, 2));
    }
  } catch (error) {
    setRedisOutput(error.message);
  }
}

document.getElementById('refreshBtn')?.addEventListener('click', loadDashboard);
bindSectionNavigation();
showSection('dashboard');

document.querySelectorAll('[data-close-modal]').forEach((element) => {
  element.addEventListener('click', hideModal);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideModal();
  }
});

document.getElementById('bookSearch')?.addEventListener('input', async (event) => {
  const term = event.target.value.trim();
  try {
    const books = await fetchJson(`${BASE_URL}/api/books?q=${encodeURIComponent(term)}`);
    renderBooks(books || []);
  } catch (error) {
    console.error(error);
  }
});

document.querySelectorAll('[data-redis]').forEach((button) => {
  button.addEventListener('click', () => triggerRedisAction(button.getAttribute('data-redis')));
});

document.getElementById('addBookButton')?.addEventListener('click', () => openLibrarianBookModal());

document.getElementById('aiToggle')?.addEventListener('click', () => {
  const panel = document.getElementById('aiPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) document.getElementById('aiInput')?.focus();
});

document.getElementById('aiClose')?.addEventListener('click', () => document.getElementById('aiPanel')?.classList.add('hidden'));
document.getElementById('aiForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  askAssistant(document.getElementById('aiInput').value);
});

document.getElementById('testEmailButton')?.addEventListener('click', async () => {
  try {
    const result = await fetchJson(`${BASE_URL}/api/email/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: state.studentId }),
    });
    showToast({ type: 'success', title: 'Test email sent', message: result.messageId || 'The email service accepted the message.' });
  } catch (error) {
    showToast({ type: 'error', title: 'Test email failed', message: error.message });
  }
  await loadEmailStatus();
});

document.getElementById('librarianSearch')?.addEventListener('input', renderLibrarianBooks);
document.getElementById('librarianCategory')?.addEventListener('change', renderLibrarianBooks);

document.querySelectorAll('[data-close-librarian-modal]').forEach((element) => {
  element.addEventListener('click', closeLibrarianModal);
});

document.querySelectorAll('[data-close-inventory-modal]').forEach((element) => {
  element.addEventListener('click', closeLibrarianModal);
});

document.getElementById('librarianBookForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  const bookId = form.dataset.bookId;
  const isEdit = Boolean(bookId);
  const payload = isEdit
    ? { title: values.title, author: values.author, category: values.category, shelf: values.shelf, description: values.description }
    : { ...values, totalCopies: Number(values.totalCopies) };

  try {
    await fetchJson(`${BASE_URL}/api/books${isEdit ? `/${encodeURIComponent(bookId)}` : ''}`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    closeLibrarianModal();
    notify(isEdit ? 'Book details updated.' : 'Book added to the catalog.');
    await loadDashboard();
  } catch (error) {
    notify(error.message, true);
  }
});

document.getElementById('inventoryForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const quantity = Number(new FormData(event.target).get('quantity'));
  try {
    await fetchJson(`${BASE_URL}/api/books/${encodeURIComponent(state.selectedBookId)}/inventory`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: state.inventoryAction, quantity }),
    });
    closeLibrarianModal();
    notify(state.inventoryAction === 'add' ? 'Copies added successfully.' : 'Copies removed successfully.');
    await loadDashboard();
  } catch (error) {
    notify(error.message, true);
  }
});

document.getElementById('addBookForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.availableCopies = Number(payload.totalCopies);
  payload.totalCopies = Number(payload.totalCopies);

  try {
    await fetchJson(`${BASE_URL}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    form.reset();
    await loadDashboard();
    showToast({ type: 'success', title: 'Book Saved', message: 'The catalog has been updated.' });
  } catch (error) {
    showToast({ type: 'error', title: 'Book save failed', message: error.message });
  }
});

document.getElementById('addStudentForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await fetchJson(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    form.reset();
    showToast({ type: 'success', title: 'Student Saved', message: 'The student record has been created.' });
  } catch (error) {
    showToast({ type: 'error', title: 'Student save failed', message: error.message });
  }
});

loadDashboard();
