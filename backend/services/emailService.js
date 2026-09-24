const nodemailer = require('nodemailer');

let lastEmail = null;

function isConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!isConfigured()) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) return { sent: false, error: 'Recipient email is unavailable.' };
  const transporter = getTransporter();
  if (!transporter) return { sent: false, error: 'Email service is not configured.' };

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    lastEmail = { recipient: to, subject, timestamp: new Date().toISOString(), status: 'sent', messageId: info.messageId };
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    lastEmail = { recipient: to, subject, timestamp: new Date().toISOString(), status: 'failed', error: error.message };
    console.error('Email notification failed:', error.message);
    return { sent: false, error: error.message };
  }
}

function studentGreeting(student) {
  return student?.name || student?.studentId || 'Library member';
}

function sendBorrowConfirmation(student, book, dueDate) {
  return sendEmail({
    to: student?.email,
    subject: `Library Borrowing Confirmation: ${book.title}`,
    text: `Hello ${studentGreeting(student)},\n\nYou borrowed ${book.title} (${book.bookId}).\nDue date: ${new Date(dueDate).toLocaleDateString('en-GB')}.`,
  });
}

function sendReturnConfirmation(student, book) {
  return sendEmail({
    to: student?.email,
    subject: `Library Return Confirmation: ${book.title}`,
    text: `Hello ${studentGreeting(student)},\n\n${book.title} (${book.bookId}) has been successfully returned.`,
  });
}

function sendReservationConfirmation(student, book, position) {
  return sendEmail({
    to: student?.email,
    subject: 'Library Reservation Confirmation',
    text: `Hello ${studentGreeting(student)},\n\nBook: ${book.title}\nBook ID: ${book.bookId}\nStudent: ${student?.name || student?.studentId}\nReservation status: Waiting queue position #${position}.`,
  });
}

function sendBookAvailableNotification(student, book) {
  return sendEmail({
    to: student?.email,
    subject: `Book Now Available - ${book.title}`,
    text: `Hello ${studentGreeting(student)},\n\n${book.title} (${book.bookId}) is now available for you after your reservation.`,
  });
}

function sendDueReminder(student, book, dueDate, kind = 'reminder') {
  const subject = kind === 'overdue' ? `Overdue Library Book: ${book.title}` : `Library Due Date Reminder: ${book.title}`;
  const message = kind === 'overdue'
    ? `${book.title} was due on ${new Date(dueDate).toLocaleDateString('en-GB')} and is now overdue.`
    : `${book.title} is due on ${new Date(dueDate).toLocaleDateString('en-GB')}.`;
  return sendEmail({
    to: student?.email,
    subject,
    text: `Hello ${studentGreeting(student)},\n\n${message}`,
  });
}

function getEmailStatus() {
  return {
    configured: isConfigured(),
    connected: isConfigured(),
    lastEmail,
  };
}

async function sendTestEmail(recipient) {
  return sendEmail({
    to: recipient || process.env.GMAIL_USER,
    subject: 'Smart College Library test email',
    text: 'The Smart College Library email service is working.',
  });
}

module.exports = {
  sendBorrowConfirmation,
  sendReturnConfirmation,
  sendReservationConfirmation,
  sendBookAvailableNotification,
  sendDueReminder,
  getEmailStatus,
  sendTestEmail,
};