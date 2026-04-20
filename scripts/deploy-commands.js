require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const appConfig = require('../config/app');

async function deployCommands() {
  if (!appConfig.botToken || !appConfig.discordClientId) {
    throw new Error('Missing BOT_TOKEN or DISCORD_CLIENT_ID in environment variables.');
  }

  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  const commands = commandFiles.map((file) => {
    const command = require(path.join(commandsPath, file));
    return command.data.toJSON();
  });

  const rest = new REST({ version: '10' }).setToken(appConfig.botToken);
  const route = appConfig.devGuildId
    ? Routes.applicationGuildCommands(appConfig.discordClientId, appConfig.devGuildId)
    : Routes.applicationCommands(appConfig.discordClientId);

  await rest.put(route, { body: commands });

  if (appConfig.devGuildId) {
    console.log(`Slash commands registered for guild ${appConfig.devGuildId}.`);
  } else {
    console.log('Global slash commands registered.');
  }
}

deployCommands().catch((error) => {
  console.error('Failed to deploy slash commands:', error);
  process.exit(1);
});
