const express = require('express');
const { SUPPORTED_LANGUAGES, isSupportedLanguage } = require('../config/languages');
const { updateGuildConfig } = require('../services/guild-config-service');
const { getGuildContext, sendAnnouncement, sendEvent, updateMemberLanguage } = require('../services/internal-bot-api');
const { normalizeDate } = require('../utils/date');
const { requireAuth, setFlash, getAccessibleGuilds, getAccessibleGuildById } = require('../web/middleware/auth');

const router = express.Router();

function getActorLabel(req) {
  const user = req.discordAuth?.user;
  if (!user) {
    return 'Web panel';
  }

  return user.global_name || user.username || 'Web panel';
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const guilds = await getAccessibleGuilds(req);
    res.render('dashboard', {
      title: 'Dashboard',
      guilds
    });
  } catch (error) {
    console.error('Could not load dashboard:', error);
    res.status(500).render('error', {
      title: 'Dashboard unavailable',
      statusCode: 500,
      message: 'The panel could not load the server list. Make sure the bot API is online.'
    });
  }
});

router.get('/guilds/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).render('error', {
        title: 'Access denied',
        statusCode: 403,
        message: 'You do not have administrator access to this server in the panel.'
      });
      return;
    }

    const context = await getGuildContext(req.params.guildId);
    res.render('guild', {
      title: `${guild.name} | Dashboard`,
      guild,
      context,
      supportedLanguages: SUPPORTED_LANGUAGES
    });
  } catch (error) {
    console.error('Could not load guild dashboard:', error);
    res.status(500).render('error', {
      title: 'Server unavailable',
      statusCode: 500,
      message: 'The server dashboard could not be loaded right now.'
    });
  }
});

router.post('/guilds/:guildId/config', requireAuth, async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).render('error', {
        title: 'Access denied',
        statusCode: 403,
        message: 'You do not have access to update this server.'
      });
      return;
    }

    const languageRoles = {};
    for (const language of SUPPORTED_LANGUAGES) {
      const roleId = req.body[`role_${language.code}`];
      if (roleId) {
        languageRoles[language.code] = roleId;
      }
    }

    const defaultLanguage = isSupportedLanguage(req.body.defaultLanguage)
      ? req.body.defaultLanguage
      : 'en';

    await updateGuildConfig(req.params.guildId, {
      logChannelId: req.body.logChannelId || null,
      fallbackChannelId: req.body.fallbackChannelId || null,
      defaultLanguage,
      languageRoles
    });

    setFlash(req, 'success', 'Server configuration updated successfully.');
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  } catch (error) {
    console.error('Could not update guild configuration:', error);
    setFlash(req, 'error', 'The configuration could not be saved.');
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  }
});

router.post('/guilds/:guildId/announce', requireAuth, async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).render('error', {
        title: 'Access denied',
        statusCode: 403,
        message: 'You do not have access to send announcements to this server.'
      });
      return;
    }

    const message = (req.body.message || '').trim();
    if (!message) {
      setFlash(req, 'error', 'The announcement message cannot be empty.');
      res.redirect(`/dashboard/guilds/${req.params.guildId}`);
      return;
    }

    const results = await sendAnnouncement(req.params.guildId, {
      message,
      actorTag: getActorLabel(req),
      source: 'web-panel'
    });

    setFlash(
      req,
      'success',
      `Announcement sent. DMs: ${results.dmSuccess}/${results.totalRecipients}. Fallback: ${results.fallbackSuccess}.`
    );
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  } catch (error) {
    console.error('Could not send announcement:', error);
    setFlash(req, 'error', 'The announcement could not be sent.');
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  }
});

router.post('/guilds/:guildId/events', requireAuth, async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).render('error', {
        title: 'Access denied',
        statusCode: 403,
        message: 'You do not have access to create events in this server.'
      });
      return;
    }

    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();
    const startsAt = normalizeDate(req.body.startsAt);

    if (!title || !description || !startsAt) {
      setFlash(req, 'error', 'Complete the title, description and a valid date.');
      res.redirect(`/dashboard/guilds/${req.params.guildId}`);
      return;
    }

    const results = await sendEvent(req.params.guildId, {
      title,
      description,
      startsAt,
      actorTag: getActorLabel(req),
      source: 'web-panel'
    });

    setFlash(
      req,
      'success',
      `Event sent. DMs: ${results.dmSuccess}/${results.totalRecipients}. Fallback: ${results.fallbackSuccess}.`
    );
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  } catch (error) {
    console.error('Could not send event:', error);
    setFlash(req, 'error', 'The event could not be sent.');
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  }
});

router.post('/guilds/:guildId/users/:userId/language', requireAuth, async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).render('error', {
        title: 'Access denied',
        statusCode: 403,
        message: 'You do not have access to update members in this server.'
      });
      return;
    }

    const language = req.body.language;
    if (!isSupportedLanguage(language)) {
      setFlash(req, 'error', 'The selected language is not supported.');
      res.redirect(`/dashboard/guilds/${req.params.guildId}`);
      return;
    }

    await updateMemberLanguage(req.params.guildId, req.params.userId, language);
    setFlash(req, 'success', 'Member language updated successfully.');
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  } catch (error) {
    console.error('Could not update member language:', error);
    setFlash(req, 'error', 'The member language could not be updated.');
    res.redirect(`/dashboard/guilds/${req.params.guildId}`);
  }
});

module.exports = router;
