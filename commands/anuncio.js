const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { broadcastAnnouncement } = require('../services/dispatch-service');
const { isGuildAdmin } = require('../utils/discord');
const { t } = require('../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Envía un anuncio traducido por DM a los miembros del servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('mensaje')
        .setDescription('Contenido del anuncio')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: t('es', 'errors.guildOnly'),
        ephemeral: true
      });
      return;
    }

    if (!isGuildAdmin(interaction.member)) {
      await interaction.reply({
        content: t('es', 'errors.adminOnly'),
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const message = interaction.options.getString('mensaje', true);
    const results = await broadcastAnnouncement({
      guild: interaction.guild,
      message,
      actorTag: interaction.user.tag,
      source: 'discord-command'
    });

    await interaction.editReply(
      `Anuncio procesado.\nMiembros objetivo: ${results.totalRecipients}\nDM correctos: ${results.dmSuccess}\nDM fallidos: ${results.dmFailed}\nFallback correcto: ${results.fallbackSuccess}\nFallback fallido: ${results.fallbackFailed}`
    );
  }
};
