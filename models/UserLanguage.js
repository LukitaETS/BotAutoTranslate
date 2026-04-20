const mongoose = require('mongoose');

const userLanguageSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true
    },
    language: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userLanguageSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserLanguage', userLanguageSchema);
