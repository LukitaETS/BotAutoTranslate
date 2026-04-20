const express = require('express');
const { buildLoginUrl, exchangeCodeForTokens, fetchDiscordGuilds, fetchDiscordUser } = require('../services/oauth-service');

const router = express.Router();

router.get('/login', (req, res) => {
  const { state, url } = buildLoginUrl();
  req.session.oauthState = state;
  req.session.afterLoginRedirect = req.query.next || '/dashboard';
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || state !== req.session.oauthState) {
    res.status(400).render('error', {
      title: 'OAuth error',
      statusCode: 400,
      message: 'The Discord OAuth state is invalid or expired. Please try logging in again.'
    });
    return;
  }

  try {
    const tokenResponse = await exchangeCodeForTokens(code);
    const [user, guilds] = await Promise.all([
      fetchDiscordUser(tokenResponse.access_token),
      fetchDiscordGuilds(tokenResponse.access_token)
    ]);

    req.session.discordAuth = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
      scope: tokenResponse.scope,
      user,
      guilds
    };

    const redirectTarget = req.session.afterLoginRedirect || '/dashboard';
    delete req.session.oauthState;
    delete req.session.afterLoginRedirect;

    req.session.save(() => {
      res.redirect(redirectTarget);
    });
  } catch (error) {
    console.error('Discord OAuth callback failed:', error);
    res.status(500).render('error', {
      title: 'OAuth error',
      statusCode: 500,
      message: 'Discord OAuth could not be completed. Check your redirect URI and client credentials.'
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
