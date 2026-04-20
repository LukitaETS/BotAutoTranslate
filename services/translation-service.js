const appConfig = require('../config/app');

async function translateWithLibreTranslate(text, targetLanguage, sourceLanguage = 'auto') {
  const response = await fetch(appConfig.translationApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage,
      target: targetLanguage,
      format: 'text',
      api_key: appConfig.translationApiKey || undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Translation provider error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.translatedText;
}

async function translateText(text, options = {}) {
  const {
    targetLanguage = 'en',
    sourceLanguage = 'auto'
  } = options;

  if (!text || !text.trim()) {
    return {
      text: '',
      translated: false,
      provider: 'none'
    };
  }

  if (appConfig.translationProvider === 'none') {
    return {
      text,
      translated: false,
      provider: 'none'
    };
  }

  if (appConfig.translationProvider === 'libretranslate') {
    try {
      const translatedText = await translateWithLibreTranslate(text, targetLanguage, sourceLanguage);
      return {
        text: translatedText,
        translated: translatedText !== text,
        provider: 'libretranslate'
      };
    } catch (error) {
      return {
        text,
        translated: false,
        provider: 'libretranslate',
        error
      };
    }
  }

  return {
    text,
    translated: false,
    provider: appConfig.translationProvider
  };
}

module.exports = {
  translateText
};
