const UserLanguage = require('../models/UserLanguage');

async function getUserLanguage(guildId, userId) {
  return UserLanguage.findOne({ guildId, userId });
}

async function getLanguagesForUsers(guildId, userIds = []) {
  if (!userIds.length) {
    return new Map();
  }

  const documents = await UserLanguage.find({
    guildId,
    userId: { $in: userIds }
  });

  return new Map(documents.map((document) => [document.userId, document]));
}

async function setUserLanguage({ guildId, userId, language, displayName = null }) {
  return UserLanguage.findOneAndUpdate(
    { guildId, userId },
    {
      $set: {
        language,
        displayName
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}

async function listGuildUserLanguages(guildId) {
  return UserLanguage.find({ guildId }).sort({ displayName: 1, userId: 1 });
}

module.exports = {
  getUserLanguage,
  getLanguagesForUsers,
  setUserLanguage,
  listGuildUserLanguages
};
