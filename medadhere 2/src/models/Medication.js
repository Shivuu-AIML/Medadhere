const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    time: { type: String, required: true }, // stored as "HH:MM"
    rxcui: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // makes sure `id` (string) is included, not just `_id`
  }
);

module.exports = mongoose.model('Medication', medicationSchema);

