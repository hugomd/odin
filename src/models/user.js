const mongoose = require('mongoose');

const User = mongoose.model('user', {
  discordId: {
    // Discord Snowflake
    type: String,
    unique: true,
    required: true
  },
  balance: Number, // Stored in Satoshi
});

module.exports = User;
