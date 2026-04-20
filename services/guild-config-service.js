const GuildConfig = require('../models/GuildConfig');
const appConfig = require('../config/app');

async function ensureGuildConfig(guildId) {
  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = await GuildConfig.create({
      guildId,
      defaultLanguage: appConfig.defaultLanguage
    });
  }

  return config;
}

async function getGuildConfig(guildId) {
  return ensureGuildConfig(guildId);
}

async function updateGuildConfig(guildId, updates = {}) {
  const payload = {
    ...updates
  };

  if (payload.languageRoles && !(payload.languageRoles instanceof Map)) {
    payload.languageRoles = Object.fromEntries(
      Object.entries(payload.languageRoles).filter(([, value]) => Boolean(value))
    );
  }

  return GuildConfig.findOneAndUpdate(
    { guildId },
    {
      $set: payload,
      $setOnInsert: {
        defaultLanguage: appConfig.defaultLanguage
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}

function serializeGuildConfig(config) {
  return {
    guildId: config.guildId,
    logChannelId: config.logChannelId,
    fallbackChannelId: config.fallbackChannelId,
    defaultLanguage: config.defaultLanguage,
    languageRoles: Object.fromEntries(config.languageRoles || [])
  };
}

module.exports = {
  ensureGuildConfig,
  getGuildConfig,
  updateGuildConfig,
  serializeGuildConfig
};
