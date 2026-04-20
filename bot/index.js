require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const appConfig = require('../config/app');
const { connectDatabase } = require('../services/database');
const { registerSlashCommands } = require('../services/command-registry');
const { createInternalBotRouter } = require('../routes/internal-bot');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }
}

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

async function bootstrap() {
  if (!appConfig.botToken) {
    throw new Error('Missing BOT_TOKEN in environment variables.');
  }

  await connectDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
  });

  client.commands = new Collection();

  loadCommands(client);
  loadEvents(client);

  const internalApi = express();
  internalApi.use(express.json({ limit: '1mb' }));
  internalApi.use('/internal', createInternalBotRouter(client));
  internalApi.listen(appConfig.botInternalApiPort, appConfig.appHost, () => {
    console.log(`Bot internal API listening on ${appConfig.appHost}:${appConfig.botInternalApiPort}`);
  });

  await client.login(appConfig.botToken);

  try {
    const result = await registerSlashCommands();
    if (result.scope === 'guild') {
      console.log(`Registered ${result.count} slash commands for guild ${result.guildId}.`);
    } else {
      console.log(`Registered ${result.count} global slash commands.`);
    }
  } catch (error) {
    console.error('Slash command registration failed during bot startup:', error);
  }
}

bootstrap().catch((error) => {
  console.error('Bot bootstrap failed:', error);
  process.exit(1);
});
