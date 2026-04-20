const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
  { code: 'pt', label: 'Português', locale: 'pt-BR' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'it', label: 'Italiano', locale: 'it-IT' }
];

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGE_MAP = new Map(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language])
);

function isSupportedLanguage(code) {
  return SUPPORTED_LANGUAGE_MAP.has(code);
}

function getLanguage(code) {
  return SUPPORTED_LANGUAGE_MAP.get(code) || SUPPORTED_LANGUAGE_MAP.get(DEFAULT_LANGUAGE);
}

function getLanguageChoices() {
  return SUPPORTED_LANGUAGES.map((language) => ({
    name: `${language.label} (${language.code})`,
    value: language.code
  }));
}

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_MAP,
  isSupportedLanguage,
  getLanguage,
  getLanguageChoices
};
