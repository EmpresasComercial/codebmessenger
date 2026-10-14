import React, { useEffect, useState } from 'react';

const MAX_TRANSLATION_CACHE = 250;
const translationCache = new Map<string, string>();
const translationsInFlight = new Map<string, Promise<string>>();
let translationQueue = Promise.resolve();

function getCachedTranslation(key: string): string | undefined {
  const value = translationCache.get(key);
  if (value === undefined) return undefined;
  translationCache.delete(key);
  translationCache.set(key, value);
  return value;
}

function cacheTranslation(key: string, value: string) {
  if (translationCache.size >= MAX_TRANSLATION_CACHE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, value);
}

export function translateText(text: string, language: string): Promise<string> {
  const cacheKey = `${language}:${text}`;
  const cached = getCachedTranslation(cacheKey);
  if (cached) return Promise.resolve(cached);
  const inFlight = translationsInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const targetLanguage = language === 'zh-hans' ? 'zh-CN' : language;
  const translation = translationQueue.then(async () => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Translation request failed with status ${response.status}.`);

    const result: unknown = await response.json();
    if (!Array.isArray(result) || !Array.isArray(result[0])) {
      throw new Error('Translation service returned an invalid response.');
    }

    const translated = result[0]
      .map((segment: unknown) => Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : '')
      .join('');
    if (!translated) throw new Error('Translation service returned no translated text.');

    cacheTranslation(cacheKey, translated);
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    return translated;
  }).catch((error: unknown) => {
    console.warn('[AutoTranslatedText] Translation failed; showing the original message.', error);
    return text;
  });

  translationsInFlight.set(cacheKey, translation);
  translation.then(() => {
    if (translationsInFlight.get(cacheKey) === translation) {
      translationsInFlight.delete(cacheKey);
    }
  });
  translationQueue = translation.then(() => undefined);
  return translation;
}

interface AutoTranslatedTextProps {
  text: string;
  language: string;
  enabled: boolean;
  renderFormatted?: (text: string) => React.ReactNode;
}

export default React.memo(function AutoTranslatedText({
  text,
  language,
  enabled,
  renderFormatted,
}: AutoTranslatedTextProps) {
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;
    setTranslated(text);
    if (!enabled || !text.trim()) return () => { isMounted = false; };

    translateText(text, language).then((result) => {
      if (isMounted) setTranslated(result);
    });

    return () => {
      isMounted = false;
    };
  }, [enabled, language, text]);

  return <>{renderFormatted ? renderFormatted(translated) : translated}</>;
});

