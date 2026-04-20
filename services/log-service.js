const { EmbedBuilder } = require('discord.js');
const { ensureGuildConfig } = require('./guild-config-service');

async function sendGuildLog(guild, options = {}) {
  const config = await ensureGuildConfig(guild.id);

  if (!config.logChannelId) {
    return false;
  }

  try {
    const channel = await guild.channels.fetch(config.logChannelId);
    if (!channel || !channel.isTextBased()) {
      return false;
    }

    const embed = new EmbedBuilder()
      .setColor(options.color || 0x2f6fed)
      .setTitle(options.title || 'Bot log')
      .setDescription(options.description || null)
      .setTimestamp(new Date());

    if (options.fields?.length) {
      embed.addFields(options.fields);
    }

    await channel.send({
      embeds: [embed]
    });

    return true;
  } catch (error) {
    console.error('Could not send guild log message:', error.message);
    return false;
  }
}

module.exports = {
  sendGuildLog
};
