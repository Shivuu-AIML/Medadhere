const mongoose = require('mongoose');

const adherenceLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD" (server UTC day)
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// One log per user+medication per day — calling "mark as taken" twice in a day
// just updates the same record instead of creating duplicates.
adherenceLogSchema.index({ userId: 1, medicationId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AdherenceLog', adherenceLogSchema);

