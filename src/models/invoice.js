const mongoose = require('mongoose');

const Invoice = mongoose.model('invoice', {
  discord: String, // Discord Snowflake
  state: {
    type: String,
    enum: ['PENDING', 'SETTLED'],
  },
  value: Number, // Satoshi
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL'], // TODO: Constants
  },
  created_at: Date,
  settled_at: {
    type: Date,
    default: null,
  },
  r_hash: {
    type: String,
    required: true,
  },
  userId: mongoose.ObjectId, // Associated userId
});

module.exports = Invoice;
