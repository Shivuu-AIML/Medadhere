const cron = require('node-cron');
const Medication = require('../models/Medication');
const Notification = require('../models/Notification');

// Every minute, checks if any medication is scheduled "now" and saves a
// notification document. In a full product this would trigger a push/email;
// for the hackathon demo it powers an in-app reminder feed.
function startReminderScheduler() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5); // "HH:MM"

    try {
      const due = await Medication.find({ time: hhmm, userId: { $exists: true } });
      if (due.length === 0) return;

      const docs = due.map((med) => ({
        userId: med.userId,
        message: `Time to take ${med.name} (${med.dosage})`,
      }));
      await Notification.insertMany(docs);

    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    }
  });
}

module.exports = { startReminderScheduler };
