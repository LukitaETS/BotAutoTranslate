require('dotenv').config();

const { registerSlashCommands } = require('../services/command-registry');

registerSlashCommands()
  .then((result) => {
    if (result.scope === 'guild') {
      console.log(`Slash commands registered for guild ${result.guildId}. Count: ${result.count}`);
      return;
    }

    console.log(`Global slash commands registered. Count: ${result.count}`);
  })
  .catch((error) => {
  console.error('Failed to deploy slash commands:', error);
  process.exit(1);
  });
