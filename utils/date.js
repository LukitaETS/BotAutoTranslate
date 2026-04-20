const { getLanguage } = require('../config/languages');

function normalizeDate(input) {
  if (!input) {
    return null;
  }

  const date = new Date(input);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const normalized = input.replace(' ', 'T');
  const fallbackDate = new Date(normalized);
  if (!Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return null;
}

function formatEventDate(dateInput, languageCode = 'en') {
  const date = dateInput instanceof Date ? dateInput : normalizeDate(dateInput);
  if (!date) {
    return null;
  }

  const language = getLanguage(languageCode);
  return new Intl.DateTimeFormat(language.locale, {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(date);
}

module.exports = {
  normalizeDate,
  formatEventDate
};
