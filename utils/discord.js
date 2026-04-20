const { PermissionFlagsBits } = require('discord.js');

function isGuildAdmin(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}

function hasAdministratorPermission(rawPermissions) {
  try {
    return (BigInt(rawPermissions) & BigInt(PermissionFlagsBits.Administrator)) === BigInt(PermissionFlagsBits.Administrator);
  } catch (error) {
    return false;
  }
}

module.exports = {
  isGuildAdmin,
  hasAdministratorPermission
};
