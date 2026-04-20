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
    const roleId = getLanguageRoleId(config, language);

    for (const member of members) {
      results.totalRecipients += 1;
      await dmLimiter.schedule(() =>
        deliverWithFallback({
          type: 'announcement',
          guild,
          member,
          dmPayload: buildAnnouncementDm(member, guild, language, translatedPayload),
          fallbackPayload: buildAnnouncementFallback(guild, member, language, translatedPayload, roleId),
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
    const roleId = getLanguageRoleId(config, language);

    for (const member of members) {
      results.totalRecipients += 1;
      await dmLimiter.schedule(() =>
        deliverWithFallback({
          type: 'event',
          guild,
          member,
          dmPayload: buildEventDm(member, guild, language, translatedPayload),
          fallbackPayload: buildEventFallback(guild, member, language, translatedPayload, roleId),
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
