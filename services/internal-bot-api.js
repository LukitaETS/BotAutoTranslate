const appConfig = require('../config/app');

async function requestBotApi(path, options = {}) {
  const response = await fetch(`${appConfig.botInternalApiUrl}/internal${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${appConfig.botInternalApiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bot API ${response.status}: ${text}`);
  }

  return response.json();
}

async function listBotGuilds() {
  const data = await requestBotApi('/guilds');
  return data.guilds;
}

async function getGuildContext(guildId) {
  return requestBotApi(`/guilds/${guildId}/context`);
}

async function sendAnnouncement(guildId, payload) {
  return requestBotApi(`/guilds/${guildId}/announce`, {
    method: 'POST',
    body: payload
  });
}

async function sendEvent(guildId, payload) {
  return requestBotApi(`/guilds/${guildId}/events`, {
    method: 'POST',
    body: payload
  });
}

async function updateMemberLanguage(guildId, userId, language) {
  return requestBotApi(`/guilds/${guildId}/users/${userId}/language`, {
    method: 'PATCH',
    body: { language }
  });
}

module.exports = {
  listBotGuilds,
  getGuildContext,
  sendAnnouncement,
  sendEvent,
  updateMemberLanguage
};
