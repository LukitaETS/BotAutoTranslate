const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { getLanguageChoices, getLanguage } = require('../config/languages');
const { ensureGuildConfig, updateGuildConfig } = require('../services/guild-config-service');
const { sendGuildLog } = require('../services/log-service');
const { isGuildAdmin } = require('../utils/discord');
const { t } = require('../utils/i18n');

function buildConfigEmbed(guild, config) {
  const languageRoles = Object.fromEntries(config.languageRoles || []);
  const rolesSummary = Object.keys(languageRoles).length
    ? Object.entries(languageRoles)
        .map(([language, roleId]) => `${language}: <@&${roleId}>`)
        .join('\n')
    : t(config.defaultLanguage, 'common.notConfigured');

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(t(config.defaultLanguage, 'config.summary'))
    .addFields(
      {
        name: 'Canal de logs',
        value: config.logChannelId ? `<#${config.logChannelId}>` : t(config.defaultLanguage, 'common.notConfigured'),
        inline: false
      },
      {
        name: 'Canal fallback',
        value: config.fallbackChannelId
          ? `<#${config.fallbackChannelId}>`
          : t(config.defaultLanguage, 'common.notConfigured'),
        inline: false
      },
      {
        name: 'Idioma por defecto',
        value: `${getLanguage(config.defaultLanguage).label} (${config.defaultLanguage})`,
        inline: false
      },
      {
        name: 'Roles por idioma',
        value: rolesSummary,
        inline: false
      }
    )
    .setFooter({ text: guild.name })
    .setTimestamp(new Date());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Gestiona la configuración del bot en este servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ver')
        .setDescription('Muestra la configuración actual del servidor.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('canal-logs')
        .setDescription('Configura o limpia el canal de logs.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal para logs (déjalo vacío para limpiar)')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('canal-fallback')
        .setDescription('Configura o limpia el canal fallback para DMs cerrados.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal fallback (déjalo vacío para limpiar)')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('idioma-default')
        .setDescription('Configura el idioma por defecto del servidor.')
        .addStringOption((option) =>
          option
            .setName('codigo')
            .setDescription('Idioma por defecto')
            .setRequired(true)
            .addChoices(...getLanguageChoices())
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rol-idioma')
        .setDescription('Asocia o limpia el rol asignado a un idioma.')
        .addStringOption((option) =>
          option
            .setName('codigo')
            .setDescription('Idioma a mapear')
            .setRequired(true)
            .addChoices(...getLanguageChoices())
        )
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('Rol que se asignará automáticamente')
            .setRequired(false)
        )
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

    const subcommand = interaction.options.getSubcommand(true);
    const currentConfig = await ensureGuildConfig(interaction.guild.id);

    if (subcommand === 'ver') {
      await interaction.reply({
        embeds: [buildConfigEmbed(interaction.guild, currentConfig)],
        ephemeral: true
      });
      return;
    }

    let updatedConfig = currentConfig;

    if (subcommand === 'canal-logs') {
      const channel = interaction.options.getChannel('canal');
      updatedConfig = await updateGuildConfig(interaction.guild.id, {
        logChannelId: channel?.id || null
      });
    }

    if (subcommand === 'canal-fallback') {
      const channel = interaction.options.getChannel('canal');
      updatedConfig = await updateGuildConfig(interaction.guild.id, {
        fallbackChannelId: channel?.id || null
      });
    }

    if (subcommand === 'idioma-default') {
      const language = interaction.options.getString('codigo', true);
      updatedConfig = await updateGuildConfig(interaction.guild.id, {
        defaultLanguage: language
      });
    }

    if (subcommand === 'rol-idioma') {
      const language = interaction.options.getString('codigo', true);
      const role = interaction.options.getRole('rol');
      const languageRoles = Object.fromEntries(currentConfig.languageRoles || []);

      if (role) {
        languageRoles[language] = role.id;
      } else {
        delete languageRoles[language];
      }

      updatedConfig = await updateGuildConfig(interaction.guild.id, {
        languageRoles
      });
    }

    await interaction.reply({
      content: t(updatedConfig.defaultLanguage, 'config.updated'),
      embeds: [buildConfigEmbed(interaction.guild, updatedConfig)],
      ephemeral: true
    });

    await sendGuildLog(interaction.guild, {
      title: 'Configuration updated',
      description: `${interaction.user.tag} updated bot settings with /config ${subcommand}.`,
      color: 0x5865f2
    });
  }
};
