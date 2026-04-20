const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const appConfig = require('../config/app');

function loadCommandDefinitions() {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  return commandFiles.map((file) => {
    const command = require(path.join(commandsPath, file));
    return command.data.toJSON();
  });
}

async function registerSlashCommands() {
  if (!appConfig.botToken || !appConfig.discordClientId) {
    throw new Error('Missing BOT_TOKEN or DISCORD_CLIENT_ID in environment variables.');
  }

  const commands = loadCommandDefinitions();
  const rest = new REST({ version: '10' }).setToken(appConfig.botToken);
  const route = appConfig.devGuildId
    ? Routes.applicationGuildCommands(appConfig.discordClientId, appConfig.devGuildId)
    : Routes.applicationCommands(appConfig.discordClientId);

  await rest.put(route, { body: commands });

  return {
    scope: appConfig.devGuildId ? 'guild' : 'global',
    guildId: appConfig.devGuildId || null,
    count: commands.length
  };
}

module.exports = {
  loadCommandDefinitions,
  registerSlashCommands
};
