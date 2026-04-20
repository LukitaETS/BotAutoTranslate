const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { broadcastEvent } = require('../services/dispatch-service');
const { normalizeDate } = require('../utils/date');
const { isGuildAdmin } = require('../utils/discord');
const { t } = require('../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evento')
    .setDescription('Crea y distribuye un evento traducido a todos los miembros.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('titulo')
        .setDescription('Título del evento')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('descripcion')
        .setDescription('Descripción del evento')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('fecha')
        .setDescription('Fecha y hora. Ejemplo: 2026-05-28 19:30')
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

    const startsAt = normalizeDate(interaction.options.getString('fecha', true));
    if (!startsAt) {
      await interaction.reply({
        content: t('es', 'errors.invalidDate'),
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const results = await broadcastEvent({
      guild: interaction.guild,
      title: interaction.options.getString('titulo', true),
      description: interaction.options.getString('descripcion', true),
      startsAt,
      actorTag: interaction.user.tag,
      source: 'discord-command'
    });

    await interaction.editReply(
      `Evento procesado.\nMiembros objetivo: ${results.totalRecipients}\nDM correctos: ${results.dmSuccess}\nDM fallidos: ${results.dmFailed}\nFallback correcto: ${results.fallbackSuccess}\nFallback fallido: ${results.fallbackFailed}`
    );
  }
};
