const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');
const Notification = require('../models/Notification');
const AdherenceLog = require('../models/AdherenceLog');
const { getRxCui } = require('../services/rxnorm');
const { getInteractionText } = require('../services/openfda');
const { summarizeInteraction } = require('../services/aiSummary');
const { requireAuth } = require('../middleware/auth');

// Protect all routes below
router.use(requireAuth);

// Escapes regex special characters so user input can't break the query
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "YYYY-MM-DD" for a given Date, in UTC (keeps the server's notion of "today" consistent)
function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

// Returns the last n date strings, oldest first, today last
function lastNDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(toDateString(d));
  }
  return dates;
}

// GET all medications, enriched with adherence data for the logged-in user:
// - takenToday: has today's dose been marked taken?
// - last7: status per day for the last 7 days ('taken' | 'missed' | 'before',
//   where 'before' means the medication didn't exist yet on that day)
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const meds = await Medication.find({ userId, userId: { $exists: true } }).sort({ createdAt: 1 });
  const dates = lastNDates(7);
  const today = dates[dates.length - 1];

  const medIds = meds.map((m) => m._id);
  const logs = await AdherenceLog.find({
    medicationId: { $in: medIds },
    date: { $in: dates },
    userId,
  });
  const takenSet = new Set(logs.map((l) => `${l.medicationId}_${l.date}`));

  const enriched = meds.map((m) => {
    const createdDateStr = toDateString(new Date(m.createdAt));
    const last7 = dates.map((date) => {
      if (date < createdDateStr) return { date, status: 'before' };
      return { date, status: takenSet.has(`${m._id}_${date}`) ? 'taken' : 'missed' };
    });
    return {
      ...m.toJSON(),
      takenToday: takenSet.has(`${m._id}_${today}`),
      last7,
    };
  });

  res.json(enriched);
});

// GET interaction check across all current medications for the logged-in user
// (defined before /:id routes to avoid any path ambiguity)
router.get('/interactions', async (req, res) => {
  const userId = req.user.id;
  const meds = await Medication.find({ userId, userId: { $exists: true } });
  const results = [];

  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const a = meds[i];
      const b = meds[j];
      const [textA, textB] = await Promise.all([
        getInteractionText(a.name).catch(() => null),
        getInteractionText(b.name).catch(() => null),
      ]);
      const summary = await summarizeInteraction(a.name, b.name, textA, textB);
      results.push({ pair: [a.name, b.name], ...summary });
    }
  }

  res.json(results);
});

// GET notifications feed (for the in-app reminder list) for the logged-in user
router.get('/notifications', async (req, res) => {
  const userId = req.user.id;
  const notes = await Notification.find({ userId, userId: { $exists: true } })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notes);
});

// POST a new medication
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { name, dosage, time } = req.body;
  if (!name || !dosage || !time) {
    return res.status(400).json({ error: 'name, dosage, and time are required' });
  }

  const trimmedName = String(name).trim();

  const existing = await Medication.findOne({
    userId,
    name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
  });
  if (existing) {
    return res.status(409).json({
      error: `${trimmedName} is already in your medication list.`,
    });
  }

  let rxcui = null;
  try {
    rxcui = await getRxCui(trimmedName);
  } catch (err) {
    console.warn(`RxNorm lookup failed for ${trimmedName}:`, err.message);
  }

  try {
    const med = await Medication.create({ userId, name: trimmedName, dosage, time, rxcui });
    res.status(201).json(med);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save medication', details: err.message });
  }
});

// DELETE a medication
router.delete('/:id', async (req, res) => {
  const userId = req.user.id;
  try {
    const medId = req.params.id;
    const deleted = await Medication.findOneAndDelete({ _id: medId, userId });
    if (!deleted) return res.status(404).json({ error: 'Medication not found' });

    await AdherenceLog.deleteMany({ medicationId: medId, userId });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: 'Invalid medication id' });
  }
});

// POST mark today's dose as taken (idempotent)
router.post('/:id/taken', async (req, res) => {
  const userId = req.user.id;
  try {
    const today = lastNDates(1)[0];
    const medicationId = req.params.id;

    // Ensure the medication belongs to the user
    const med = await Medication.findOne({ _id: medicationId, userId });
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    const log = await AdherenceLog.findOneAndUpdate(
      { medicationId, userId, date: today },
      { medicationId, userId, date: today },
      { upsert: true, new: true }
    );
    res.status(200).json(log);
  } catch (err) {
    res.status(400).json({ error: 'Could not mark as taken', details: err.message });
  }
});

// DELETE un-mark today's dose
router.delete('/:id/taken', async (req, res) => {
  const userId = req.user.id;
  try {
    const today = lastNDates(1)[0];
    const medicationId = req.params.id;
    await AdherenceLog.deleteOne({ medicationId, userId, date: today });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: 'Could not update' });
  }
});

module.exports = router;

