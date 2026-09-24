const { client } = require('../config/redis');
const { getBookById, getStudent } = require('./mongoService');
const { sendDueReminder } = require('./emailService');

async function checkDueDateReminders() {
  const keys = await client.keys('ACTIVE_ISSUE:*');
  const results = [];
  const now = new Date();
  for (const key of keys) {
    const raw = await client.get(key);
    if (!raw) continue;
    const issue = JSON.parse(raw);
    const due = new Date(issue.dueDate);
    const daysUntilDue = Math.ceil((due - now) / 86400000);
    const kind = daysUntilDue < 0 ? 'overdue' : 'reminder';
    const eventKey = `EMAIL_EVENT:${issue.studentId}:${issue.bookId}:${kind}:${due.toISOString().slice(0, 10)}`;
    if (await client.exists(eventKey)) continue;
    if (daysUntilDue === 2 || daysUntilDue === 0 || daysUntilDue < 0) {
      const [student, book] = await Promise.all([getStudent(issue.studentId), getBookById(issue.bookId)]);
      const result = await sendDueReminder(student, book || { bookId: issue.bookId, title: issue.bookId }, issue.dueDate, kind);
      if (result.sent) await client.set(eventKey, 'sent');
      results.push({ ...issue, kind, result });
    }
  }
  return results;
}

module.exports = { checkDueDateReminders };