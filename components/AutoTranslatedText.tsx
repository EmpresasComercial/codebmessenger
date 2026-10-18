import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

const MAX_TRANSLATION_CACHE = 250;
const EMPTY_SENSITIVE_VALUES: readonly string[] = [];
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
    logger.warn('AutoTranslatedText', 'Translation failed; showing the original message.', error);
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

function translateTextPreservingUrls(text: string, language: string): Promise<string> {
  return Promise.all(
    text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi).map((part) =>
      !part.trim() || /^(https?:\/\/|www\.)/i.test(part)
        ? Promise.resolve(part)
        : translateText(part, language)
    )
  ).then((parts) => parts.join(''));
}

interface MaskedText {
  text: string;
  restore: (translated: string) => string;
  placeholders: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskSensitiveText(text: string, sensitiveValues: readonly string[] = []): MaskedText {
  const replacements: Array<{ placeholder: string; value: string }> = [];
  let maskedText = text;

  const mask = (value: string, isIban = false) => {
    const normalized = value.trim();
    if (!normalized) return;

    const pattern = isIban
      ? new RegExp(`(?<![A-Z0-9])${[...normalized.replace(/[\s-]/g, '')].map(escapeRegExp).join('[\\s-]*')}(?![A-Z0-9])`, 'gi')
      : new RegExp(escapeRegExp(normalized).replace(/\s+/g, '\\s+'), 'gi');

    maskedText = maskedText.replace(pattern, (match) => {
      let placeholder = `ZXQPRIVATE${replacements.length}TOKENQXZ`;
      while (text.includes(placeholder)) {
        placeholder = `Z${placeholder}`;
      }
      replacements.push({ placeholder, value: match });
      return placeholder;
    });
  };

  [...sensitiveValues]
    .filter((value) => typeof value === 'string' && value.trim())
    .sort((a, b) => b.length - a.length)
    .forEach((value) => mask(value, /^[A-Z]{2}\d{2}[A-Z0-9\s-]+$/i.test(value)));

  const detectedIbans = [
    ...(text.match(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi) || []),
    ...(text.match(/\bAO\d{2}(?:[\s-]?[A-Z0-9]){21}\b/gi) || []),
    ...(text.match(/(?<!\d)(?:\d[\s-]?){20}\d(?!\d)/g) || []),
  ];
  detectedIbans.forEach((iban) => mask(iban, true));

  return {
    text: maskedText,
    placeholders: replacements.map(({ placeholder }) => placeholder),
    restore: (translated) =>
      replacements.reduce(
        (result, { placeholder, value }) => result.replace(placeholder, value),
        translated
      ),
  };
}

interface AutoTranslatedTextProps {
  text: string;
  language: string;
  enabled: boolean;
  renderFormatted?: (text: string) => React.ReactNode;
  preserveUrls?: boolean;
  sensitiveValues?: readonly string[];
}

export default React.memo(function AutoTranslatedText({
  text,
  language,
  enabled,
  renderFormatted,
  preserveUrls = false,
  sensitiveValues = EMPTY_SENSITIVE_VALUES,
}: AutoTranslatedTextProps) {
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;
    setTranslated(text);
    if (!enabled || !text.trim()) return () => { isMounted = false; };

    const masked = maskSensitiveText(text, sensitiveValues);
    const translation = preserveUrls
      ? translateTextPreservingUrls(masked.text, language)
      : translateText(masked.text, language);

    translation.then((result) => {
      if (!isMounted) return;
      if (masked.placeholders.some((placeholder) => !result.includes(placeholder))) {
        logger.warn('AutoTranslatedText', 'Translation changed a protected-value placeholder; showing the original message.');
        setTranslated(text);
        return;
      }
      setTranslated(masked.restore(result));
    });

    return () => {
      isMounted = false;
    };
  }, [enabled, language, preserveUrls, sensitiveValues, text]);

  return <>{renderFormatted ? renderFormatted(translated) : translated}</>;
});
