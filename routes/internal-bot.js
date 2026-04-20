const express = require('express');
const { ChannelType } = require('discord.js');
const appConfig = require('../config/app');
const { isSupportedLanguage } = require('../config/languages');
const { ensureGuildConfig, serializeGuildConfig } = require('../services/guild-config-service');
const { broadcastAnnouncement, broadcastEvent } = require('../services/dispatch-service');
const { setMemberLanguagePreference } = require('../services/role-sync-service');
const { getLanguagesForUsers } = require('../services/language-preference-service');
const { normalizeDate } = require('../utils/date');

function createInternalBotRouter(client) {
  const router = express.Router();

  router.use((req, res, next) => {
    const authorization = req.headers.authorization || '';
    const expected = `Bearer ${appConfig.botInternalApiToken}`;

    if (!appConfig.botInternalApiToken || authorization !== expected) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  });

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      botReady: client.isReady(),
      guilds: client.guilds.cache.size
    });
  });

  router.get('/guilds', (_req, res) => {
    const guilds = [...client.guilds.cache.values()]
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        iconURL: guild.iconURL({ size: 128 })
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    res.json({ guilds });
  });

  router.get('/guilds/:guildId/context', async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      const [config, fetchedChannels, fetchedRoles, fetchedMembers] = await Promise.all([
        ensureGuildConfig(guild.id),
        guild.channels.fetch(),
        guild.roles.fetch(),
        guild.members.fetch()
      ]);

      const humanMembers = [...fetchedMembers.values()].filter((member) => !member.user.bot);
      const preferenceMap = await getLanguagesForUsers(
        guild.id,
        humanMembers.map((member) => member.id)
      );

      const channels = [...fetchedChannels.values()]
        .filter(
          (channel) =>
            channel &&
            channel.isTextBased() &&
            !channel.isDMBased() &&
            channel.type !== ChannelType.GuildCategory
        )
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      const roles = [...fetchedRoles.values()]
        .filter((role) => role && !role.managed)
        .map((role) => ({
          id: role.id,
          name: role.name,
          color: role.hexColor
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      const members = humanMembers
        .map((member) => ({
          id: member.id,
          username: member.user.username,
          displayName: member.displayName,
          avatarURL: member.displayAvatarURL({ size: 64 }),
          language: preferenceMap.get(member.id)?.language || config.defaultLanguage
        }))
        .sort((left, right) => left.displayName.localeCompare(right.displayName));

      res.json({
        guild: {
          id: guild.id,
          name: guild.name,
          iconURL: guild.iconURL({ size: 128 })
        },
        config: serializeGuildConfig(config),
        channels,
        roles,
        members
      });
    } catch (error) {
      console.error('Error building guild context:', error);
      res.status(500).json({ error: 'Could not build guild context.' });
    }
  });

  router.post('/guilds/:guildId/announce', async (req, res) => {
    try {
      const { message, actorTag, source } = req.body || {};
      if (!message) {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      const guild = await client.guilds.fetch(req.params.guildId);
      const results = await broadcastAnnouncement({
        guild,
        message,
        actorTag: actorTag || 'Web panel',
        source: source || 'web-panel'
      });

      res.json(results);
    } catch (error) {
      console.error('Error sending announcement from internal API:', error);
      res.status(500).json({ error: 'Could not send announcement.' });
    }
  });

  router.post('/guilds/:guildId/events', async (req, res) => {
    try {
      const { title, description, startsAt, actorTag, source } = req.body || {};
      const normalizedDate = normalizeDate(startsAt);

      if (!title || !description || !normalizedDate) {
        res.status(400).json({ error: 'title, description and a valid startsAt are required' });
        return;
      }

      const guild = await client.guilds.fetch(req.params.guildId);
      const results = await broadcastEvent({
        guild,
        title,
        description,
        startsAt: normalizedDate,
        actorTag: actorTag || 'Web panel',
        source: source || 'web-panel'
      });

      res.json(results);
    } catch (error) {
      console.error('Error sending event from internal API:', error);
      res.status(500).json({ error: 'Could not send event.' });
    }
  });

  router.patch('/guilds/:guildId/users/:userId/language', async (req, res) => {
    try {
      const { language } = req.body || {};
      if (!language || !isSupportedLanguage(language)) {
        res.status(400).json({ error: 'A supported language is required' });
        return;
      }

      const guild = await client.guilds.fetch(req.params.guildId);
      const member = await guild.members.fetch(req.params.userId);
      const result = await setMemberLanguagePreference(member, language);

      res.json({
        ok: true,
        language,
        roleSync: result.roleSync
      });
    } catch (error) {
      console.error('Error updating member language from internal API:', error);
      res.status(500).json({ error: 'Could not update member language.' });
    }
  });

  return router;
}

module.exports = {
  createInternalBotRouter
};
