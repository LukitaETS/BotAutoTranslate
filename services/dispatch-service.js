const Bottleneck = require('bottleneck');
const { EmbedBuilder } = require('discord.js');
const appConfig = require('../config/app');
const { t } = require('../utils/i18n');
const { formatEventDate } = require('../utils/date');
const { ensureGuildConfig } = require('./guild-config-service');
const { getLanguagesForUsers } = require('./language-preference-service');
const { translateText } = require('./translation-service');
const { sendGuildLog } = require('./log-service');

const dmLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: appConfig.dmMinIntervalMs
});

async function translateAnnouncementPayload(content, language) {
  const translatedContent = await translateText(content, {
    targetLanguage: language
  });

  return {
    content: translatedContent.text
  };
}

async function translateEventPayload({ title, description, startsAt }, language) {
  const [translatedTitle, translatedDescription] = await Promise.all([
    translateText(title, { targetLanguage: language }),
    translateText(description, { targetLanguage: language })
  ]);

  return {
    title: translatedTitle.text,
    description: translatedDescription.text,
    startsAt,
    formattedDate: formatEventDate(startsAt, language)
  };
}

function buildAnnouncementDm(member, guild, language, payload) {
  const embed = new EmbedBuilder()
    .setColor(0x2f6fed)
    .setTitle(t(language, 'announcement.title'))
    .setDescription(payload.content)
    .addFields({
      name: t(language, 'common.server'),
      value: guild.name,
      inline: true
    })
    .setFooter({
      text: t(language, 'announcement.footer')
    })
    .setTimestamp(new Date());

  return {
    content: t(language, 'announcement.message', {
      name: member.displayName,
      server: guild.name
    }),
    embeds: [embed],
    allowedMentions: { parse: [] }
  };
}

function buildEventDm(member, guild, language, payload) {
  const embed = new EmbedBuilder()
    .setColor(0x2fb36f)
    .setTitle(payload.title || t(language, 'event.title'))
    .setDescription(payload.description)
    .addFields(
      {
        name: t(language, 'event.when'),
        value: payload.formattedDate || 'N/A',
        inline: false
      },
      {
        name: t(language, 'common.server'),
        value: guild.name,
        inline: true
      }
    )
    .setFooter({
      text: t(language, 'event.footer')
    })
    .setTimestamp(new Date(payload.startsAt));

  return {
    content: t(language, 'event.message', {
      name: member.displayName,
      server: guild.name
    }),
    embeds: [embed],
    allowedMentions: { parse: [] }
  };
}

function buildAnnouncementFallback(guild, member, payload) {
  return {
    content: `<@${member.id}> ${t('en', 'fallback.announcement', { server: guild.name })}\n\n${payload.content}`,
    allowedMentions: {
      users: [member.id]
    }
  };
}

function buildEventFallback(guild, member, payload) {
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle(payload.title || t('en', 'event.title'))
    .setDescription(payload.description)
    .addFields({
      name: t('en', 'event.when'),
      value: payload.formattedDate || 'N/A'
    })
    .setTimestamp(new Date(payload.startsAt));

  return {
    content: `<@${member.id}> ${t('en', 'fallback.event', { server: guild.name })}`,
    embeds: [embed],
    allowedMentions: {
      users: [member.id]
    }
  };
}

async function getRecipientGroups(guild, defaultLanguage) {
  const members = await guild.members.fetch();
  const humanMembers = [...members.values()].filter((member) => !member.user.bot);
  const preferenceMap = await getLanguagesForUsers(
    guild.id,
    humanMembers.map((member) => member.id)
  );

  const groupedMembers = new Map();
  for (const member of humanMembers) {
    const language = preferenceMap.get(member.id)?.language || defaultLanguage;
    if (!groupedMembers.has(language)) {
      groupedMembers.set(language, []);
    }
    groupedMembers.get(language).push(member);
  }

  return groupedMembers;
}

async function getFallbackChannel(guild, config) {
  if (!config.fallbackChannelId) {
    return null;
  }

  try {
    const channel = await guild.channels.fetch(config.fallbackChannelId);
    return channel && channel.isTextBased() ? channel : null;
  } catch (error) {
    return null;
  }
}

async function deliverWithFallback({ type, guild, member, dmPayload, fallbackPayload, fallbackChannel, results }) {
  try {
    await member.send(dmPayload);
    results.dmSuccess += 1;
    return;
  } catch (error) {
    results.dmFailed += 1;
    results.dmFailures.push({
      userId: member.id,
      username: member.user.username,
      reason: error.message
    });
  }

  if (!fallbackChannel) {
    results.fallbackFailed += 1;
    return;
  }

  try {
    await fallbackChannel.send(fallbackPayload);
    results.fallbackSuccess += 1;
  } catch (error) {
    results.fallbackFailed += 1;
  }
}

async function broadcastAnnouncement({ guild, message, actorTag = 'Unknown', source = 'discord' }) {
  const config = await ensureGuildConfig(guild.id);
  const groupedMembers = await getRecipientGroups(guild, config.defaultLanguage);
  const fallbackChannel = await getFallbackChannel(guild, config);
  const translatedPayloadCache = new Map();
  const fallbackPayload = await translateAnnouncementPayload(message, 'en');

  const results = {
    type: 'announcement',
    totalRecipients: 0,
    dmSuccess: 0,
    dmFailed: 0,
    fallbackSuccess: 0,
    fallbackFailed: 0,
    dmFailures: []
  };

  for (const [language, members] of groupedMembers.entries()) {
    if (!translatedPayloadCache.has(language)) {
      translatedPayloadCache.set(language, await translateAnnouncementPayload(message, language));
    }

    const translatedPayload = translatedPayloadCache.get(language);

    for (const member of members) {
      results.totalRecipients += 1;
      await dmLimiter.schedule(() =>
        deliverWithFallback({
          type: 'announcement',
          guild,
          member,
          dmPayload: buildAnnouncementDm(member, guild, language, translatedPayload),
          fallbackPayload: buildAnnouncementFallback(guild, member, fallbackPayload),
          fallbackChannel,
          results
        })
      );
    }
  }

  await sendGuildLog(guild, {
    title: 'Announcement sent',
    description: `Source: ${source}`,
    fields: [
      { name: 'Triggered by', value: actorTag, inline: true },
      { name: 'Recipients', value: String(results.totalRecipients), inline: true },
      { name: 'DM success', value: String(results.dmSuccess), inline: true },
      { name: 'DM failed', value: String(results.dmFailed), inline: true },
      { name: 'Fallback success', value: String(results.fallbackSuccess), inline: true },
      { name: 'Fallback failed', value: String(results.fallbackFailed), inline: true }
    ]
  });

  return results;
}

async function broadcastEvent({ guild, title, description, startsAt, actorTag = 'Unknown', source = 'discord' }) {
  const config = await ensureGuildConfig(guild.id);
  const groupedMembers = await getRecipientGroups(guild, config.defaultLanguage);
  const fallbackChannel = await getFallbackChannel(guild, config);
  const translatedPayloadCache = new Map();
  const fallbackPayload = await translateEventPayload({ title, description, startsAt }, 'en');

  const results = {
    type: 'event',
    totalRecipients: 0,
    dmSuccess: 0,
    dmFailed: 0,
    fallbackSuccess: 0,
    fallbackFailed: 0,
    dmFailures: []
  };

  for (const [language, members] of groupedMembers.entries()) {
    if (!translatedPayloadCache.has(language)) {
      translatedPayloadCache.set(
        language,
        await translateEventPayload({ title, description, startsAt }, language)
      );
    }

    const translatedPayload = translatedPayloadCache.get(language);

    for (const member of members) {
      results.totalRecipients += 1;
      await dmLimiter.schedule(() =>
        deliverWithFallback({
          type: 'event',
          guild,
          member,
          dmPayload: buildEventDm(member, guild, language, translatedPayload),
          fallbackPayload: buildEventFallback(guild, member, fallbackPayload),
          fallbackChannel,
          results
        })
      );
    }
  }

  await sendGuildLog(guild, {
    title: 'Event sent',
    description: `Source: ${source}`,
    fields: [
      { name: 'Triggered by', value: actorTag, inline: true },
      { name: 'Recipients', value: String(results.totalRecipients), inline: true },
      { name: 'DM success', value: String(results.dmSuccess), inline: true },
      { name: 'DM failed', value: String(results.dmFailed), inline: true },
      { name: 'Fallback success', value: String(results.fallbackSuccess), inline: true },
      { name: 'Fallback failed', value: String(results.fallbackFailed), inline: true }
    ]
  });

  return results;
}

module.exports = {
  broadcastAnnouncement,
  broadcastEvent
};
