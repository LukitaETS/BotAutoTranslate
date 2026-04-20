const { getLanguage } = require('../config/languages');
const { ensureGuildConfig } = require('./guild-config-service');
const { setUserLanguage } = require('./language-preference-service');

async function syncLanguageRoleForMember(member, targetLanguage, config = null) {
  const guildConfig = config || await ensureGuildConfig(member.guild.id);
  const languageRoles = Object.fromEntries(guildConfig.languageRoles || []);
  const roleIds = Object.values(languageRoles).filter(Boolean);
  const targetRoleId = languageRoles[targetLanguage];

  const result = {
    removedRoles: [],
    addedRole: null,
    warnings: []
  };

  try {
    const rolesToRemove = roleIds.filter(
      (roleId) => roleId !== targetRoleId && member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) {
      await member.roles.remove(rolesToRemove, 'Language preference updated');
      result.removedRoles = rolesToRemove;
    }

    if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
      await member.roles.add(targetRoleId, 'Language preference updated');
      result.addedRole = targetRoleId;
    }
  } catch (error) {
    result.warnings.push(error.message);
  }

  return result;
}

async function setMemberLanguagePreference(member, language) {
  const config = await ensureGuildConfig(member.guild.id);
  const preference = await setUserLanguage({
    guildId: member.guild.id,
    userId: member.id,
    language,
    displayName: member.displayName
  });

  const roleSync = await syncLanguageRoleForMember(member, language, config);
  return {
    preference,
    roleSync,
    languageName: getLanguage(language).label
  };
}

module.exports = {
  syncLanguageRoleForMember,
  setMemberLanguagePreference
};
