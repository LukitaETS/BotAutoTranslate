const { hasAdministratorPermission } = require('../../utils/discord');
const { hydrateDiscordSession } = require('../../services/oauth-service');
const { listBotGuilds } = require('../../services/internal-bot-api');

async function requireAuth(req, res, next) {
  try {
    const auth = await hydrateDiscordSession(req);
    if (!auth) {
      if (req.originalUrl.startsWith('/api')) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
      return;
    }

    req.discordAuth = auth;
    res.locals.currentUser = auth.user;
    next();
  } catch (error) {
    console.error('Authentication middleware failed:', error);
    req.session.destroy(() => {
      if (req.originalUrl.startsWith('/api')) {
        res.status(401).json({ error: 'Authentication expired.' });
        return;
      }

      res.redirect('/auth/login');
    });
  }
}

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

async function getAccessibleGuilds(req) {
  const auth = req.discordAuth || await hydrateDiscordSession(req);
  if (!auth) {
    return [];
  }

  const botGuilds = await listBotGuilds();
  const botGuildMap = new Map(botGuilds.map((guild) => [guild.id, guild]));

  return (auth.guilds || [])
    .filter((guild) => botGuildMap.has(guild.id) && hasAdministratorPermission(guild.permissions))
    .map((guild) => {
      const botGuild = botGuildMap.get(guild.id);
      return {
        id: guild.id,
        name: botGuild?.name || guild.name,
        iconURL:
          botGuild?.iconURL ||
          (guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null),
        permissions: guild.permissions
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function getAccessibleGuildById(req, guildId) {
  const guilds = await getAccessibleGuilds(req);
  return guilds.find((guild) => guild.id === guildId) || null;
}

module.exports = {
  requireAuth,
  setFlash,
  getAccessibleGuilds,
  getAccessibleGuildById
};
