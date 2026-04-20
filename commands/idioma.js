const { SlashCommandBuilder } = require('discord.js');
const { getLanguageChoices } = require('../config/languages');
const { setMemberLanguagePreference } = require('../services/role-sync-service');
const { t } = require('../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('idioma')
    .setDescription('Selecciona el idioma en el que quieres recibir anuncios y eventos.')
    .addStringOption((option) =>
      option
        .setName('codigo')
        .setDescription('Idioma preferido')
        .setRequired(true)
        .addChoices(...getLanguageChoices())
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: t('es', 'errors.guildOnly'),
        ephemeral: true
      });
      return;
    }

    const language = interaction.options.getString('codigo', true);
    const result = await setMemberLanguagePreference(interaction.member, language);

    let content = t(language, 'language.updated', {
      language: result.languageName
    });

    if (result.roleSync.warnings.length) {
      content += `\n\nAviso: no pude sincronizar todos los roles automáticamente. ${result.roleSync.warnings.join(' | ')}`;
    }

    await interaction.reply({
      content,
      ephemeral: true
    });
  }
};
