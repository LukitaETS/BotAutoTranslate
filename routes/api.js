const express = require('express');
const { SUPPORTED_LANGUAGES, isSupportedLanguage } = require('../config/languages');
const { updateGuildConfig } = require('../services/guild-config-service');
const { getGuildContext, sendAnnouncement, sendEvent, updateMemberLanguage } = require('../services/internal-bot-api');
const { normalizeDate } = require('../utils/date');
const { requireAuth, getAccessibleGuilds, getAccessibleGuildById } = require('../web/middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/servers', async (req, res) => {
  try {
    const guilds = await getAccessibleGuilds(req);
    res.json({ guilds });
  } catch (error) {
    console.error('API /servers failed:', error);
    res.status(500).json({ error: 'Could not fetch guild list.' });
  }
});

router.get('/servers/:guildId', async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const context = await getGuildContext(req.params.guildId);
    res.json(context);
  } catch (error) {
    console.error('API /servers/:guildId failed:', error);
    res.status(500).json({ error: 'Could not fetch guild context.' });
  }
});

router.get('/servers/:guildId/users', async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const context = await getGuildContext(req.params.guildId);
    res.json({ members: context.members });
  } catch (error) {
    console.error('API /servers/:guildId/users failed:', error);
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});

router.put('/servers/:guildId/config', async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const rolePayload = {};
    for (const language of SUPPORTED_LANGUAGES) {
      const roleId = req.body.languageRoles?.[language.code];
      if (roleId) {
        rolePayload[language.code] = roleId;
      }
    }

    const defaultLanguage = isSupportedLanguage(req.body.defaultLanguage)
      ? req.body.defaultLanguage
      : 'en';

    const config = await updateGuildConfig(req.params.guildId, {
      logChannelId: req.body.logChannelId || null,
      fallbackChannelId: req.body.fallbackChannelId || null,
      defaultLanguage,
      languageRoles: rolePayload
    });

    res.json({ ok: true, config });
  } catch (error) {
    console.error('API config update failed:', error);
    res.status(500).json({ error: 'Could not update configuration.' });
  }
});

router.post('/servers/:guildId/announce', async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (!req.body.message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const results = await sendAnnouncement(req.params.guildId, {
      message: req.body.message,
      actorTag: req.discordAuth.user?.username || 'Web API',
      source: 'web-api'
    });

    res.json(results);
  } catch (error) {
    console.error('API announcement failed:', error);
    res.status(500).json({ error: 'Could not send announcement.' });
  }
});

router.post('/servers/:guildId/events', async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const startsAt = normalizeDate(req.body.startsAt);
    if (!req.body.title || !req.body.description || !startsAt) {
      res.status(400).json({ error: 'title, description and valid startsAt are required' });
      return;
    }

    const results = await sendEvent(req.params.guildId, {
      title: req.body.title,
      description: req.body.description,
      startsAt,
      actorTag: req.discordAuth.user?.username || 'Web API',
      source: 'web-api'
    });

    res.json(results);
  } catch (error) {
    console.error('API event failed:', error);
    res.status(500).json({ error: 'Could not send event.' });
  }
});

router.patch('/servers/:guildId/users/:userId/language', async (req, res) => {
  try {
    const guild = await getAccessibleGuildById(req, req.params.guildId);
    if (!guild) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (!isSupportedLanguage(req.body.language)) {
      res.status(400).json({ error: 'Unsupported language.' });
      return;
    }

    const result = await updateMemberLanguage(
      req.params.guildId,
      req.params.userId,
      req.body.language
    );

    res.json(result);
  } catch (error) {
    console.error('API member language update failed:', error);
    res.status(500).json({ error: 'Could not update member language.' });
  }
});

module.exports = router;
