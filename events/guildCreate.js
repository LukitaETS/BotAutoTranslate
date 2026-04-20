const { ensureGuildConfig } = require('../services/guild-config-service');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    await ensureGuildConfig(guild.id);
    console.log(`Configuración inicial creada para ${guild.name} (${guild.id})`);
  }
};
