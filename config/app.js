const { DEFAULT_LANGUAGE } = require('./languages');

const railwayPublicBaseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : null;

module.exports = {
  appBaseUrl: process.env.APP_BASE_URL || railwayPublicBaseUrl || 'http://localhost:3000',
  appHost: process.env.HOST || '::',
  webPort: Number(process.env.PORT || process.env.WEB_PORT || 3000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/discord-language-bot',
  sessionSecret: process.env.SESSION_SECRET || 'replace_me',
  botToken: process.env.BOT_TOKEN,
  discordClientId: process.env.DISCORD_CLIENT_ID,
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI,
  devGuildId: process.env.DEV_GUILD_ID,
  botInternalApiPort: Number(process.env.BOT_INTERNAL_API_PORT || 3050),
  botInternalApiUrl: process.env.BOT_INTERNAL_API_URL || `http://127.0.0.1:${process.env.BOT_INTERNAL_API_PORT || 3050}`,
  botInternalApiToken: process.env.BOT_INTERNAL_API_TOKEN,
  translationProvider: process.env.TRANSLATION_PROVIDER || 'libretranslate',
  translationApiUrl: process.env.TRANSLATION_API_URL || 'https://libretranslate.com/translate',
  translationApiKey: process.env.TRANSLATION_API_KEY,
  defaultLanguage: process.env.DEFAULT_LANGUAGE || DEFAULT_LANGUAGE,
  dmMinIntervalMs: Number(process.env.DM_MIN_INTERVAL_MS || 450)
};
