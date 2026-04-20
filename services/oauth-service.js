const crypto = require('crypto');
const appConfig = require('../config/app');

const DISCORD_API_BASE = 'https://discord.com/api';

function buildLoginUrl() {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: appConfig.discordClientId,
    response_type: 'code',
    redirect_uri: appConfig.discordRedirectUri,
    scope: 'identify guilds',
    state,
    prompt: 'consent'
  });

  return {
    state,
    url: `https://discord.com/oauth2/authorize?${params.toString()}`
  };
}

async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    client_id: appConfig.discordClientId,
    client_secret: appConfig.discordClientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: appConfig.discordRedirectUri
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token exchange failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: appConfig.discordClientId,
    client_secret: appConfig.discordClientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token refresh failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function fetchDiscordResource(path, accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord API request failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function fetchDiscordUser(accessToken) {
  return fetchDiscordResource('/users/@me', accessToken);
}

async function fetchDiscordGuilds(accessToken) {
  return fetchDiscordResource('/users/@me/guilds', accessToken);
}

async function hydrateDiscordSession(req) {
  const auth = req.session.discordAuth;
  if (!auth) {
    return null;
  }

  if (Date.now() >= (auth.expiresAt || 0) - 60_000 && auth.refreshToken) {
    const refreshed = await refreshAccessToken(auth.refreshToken);
    auth.accessToken = refreshed.access_token;
    auth.refreshToken = refreshed.refresh_token || auth.refreshToken;
    auth.scope = refreshed.scope;
    auth.expiresAt = Date.now() + (refreshed.expires_in || 3600) * 1000;
  }

  const [user, guilds] = await Promise.all([
    fetchDiscordUser(auth.accessToken),
    fetchDiscordGuilds(auth.accessToken)
  ]);

  auth.user = user;
  auth.guilds = guilds;
  req.session.discordAuth = auth;

  return auth;
}

module.exports = {
  buildLoginUrl,
  exchangeCodeForTokens,
  fetchDiscordGuilds,
  fetchDiscordUser,
  hydrateDiscordSession
};
