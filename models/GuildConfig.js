const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    logChannelId: {
      type: String,
      default: null
    },
    fallbackChannelId: {
      type: String,
      default: null
    },
    defaultLanguage: {
      type: String,
      default: 'en'
    },
    languageRoles: {
      type: Map,
      of: String,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
