const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { getLanguageChoices, getLanguage } = require('../config/languages');
const {
  ensureGuildConfig,
  updateGuildConfig
} = require('../services/guild-config-service');
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
        name: 'Log channel',
        value: config.logChannelId
          ? `<#${config.logChannelId}>`
          : t(config.defaultLanguage, 'common.notConfigured'),
        inline: false
      },
      {
        name: 'Fallback channel',
        value: config.fallbackChannelId
          ? `<#${config.fallbackChannelId}>`
          : t(config.defaultLanguage, 'common.notConfigured'),
        inline: false
      },
      {
        name: 'Default language',
        value: `${getLanguage(config.defaultLanguage).label} (${config.defaultLanguage})`,
        inline: false
      },
      {
        name: 'Language roles',
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
    .setDescription('Manage the bot configuration in this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ver')
        .setDescription('Show the current server configuration.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('canal-logs')
        .setDescription('Set or clear the log channel.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Channel for logs. Leave empty to clear it.')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('canal-fallback')
        .setDescription('Set or clear the fallback channel for closed DMs.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Fallback channel used for language-role mentions.')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('idioma-default')
        .setDescription('Set the default language for this server.')
        .addStringOption((option) =>
          option
            .setName('codigo')
            .setDescription('Default language')
            .setRequired(true)
            .addChoices(...getLanguageChoices())
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rol-idioma')
        .setDescription('Set or clear the role assigned to a language.')
        .addStringOption((option) =>
          option
            .setName('codigo')
            .setDescription('Language code')
            .setRequired(true)
            .addChoices(...getLanguageChoices())
        )
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('Role assigned automatically for this language')
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
    let updatedConfig = currentConfig;

    if (subcommand === 'ver') {
      await interaction.reply({
        embeds: [buildConfigEmbed(interaction.guild, currentConfig)],
        ephemeral: true
      });
      return;
    }

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
