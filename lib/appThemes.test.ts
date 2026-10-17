import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_THEMES,
  APP_THEME_STORAGE_KEY,
  applyAppTheme,
  getSavedAppTheme,
  isAppThemeId,
  saveAppTheme,
} from './appThemes';

test('accepts only theme ids defined in the app palette', () => {
  for (const theme of APP_THEMES) {
    assert.equal(isAppThemeId(theme.id), true);
  }

  assert.equal(isAppThemeId('unknown'), false);
  assert.equal(isAppThemeId(null), false);
});

test('non-default theme colors keep readable text contrast in light and dark mode', () => {
  const contrastRatio = (first: string, second: string) => {
    const luminance = (color: string) => {
      const channels = color.match(/[0-9a-f]{2}/gi)!.map((channel) => parseInt(channel, 16) / 255);
      const [red, green, blue] = channels.map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const firstLuminance = luminance(first);
    const secondLuminance = luminance(second);
    return (Math.max(firstLuminance, secondLuminance) + 0.05)
      / (Math.min(firstLuminance, secondLuminance) + 0.05);
  };

  for (const theme of APP_THEMES) {
    assert.ok(contrastRatio('#ffffff', theme.accent) >= 4.5, `${theme.id} light accent`);
    assert.ok(contrastRatio('#17212b', theme.surface) >= 4.5, `${theme.id} light surface`);
    assert.ok(contrastRatio('#17212b', theme.chatBackground) >= 4.5, `${theme.id} light chat`);
    assert.ok(contrastRatio('#ffffff', theme.outgoingBubble) >= 4.5, `${theme.id} light outgoing bubble`);
    assert.ok(contrastRatio(theme.darkAccent, theme.darkChatBackground) >= 4.5, `${theme.id} dark accent`);
    assert.ok(contrastRatio('#ffffff', theme.darkOutgoingBubble) >= 4.5, `${theme.id} dark outgoing bubble`);
    assert.ok(contrastRatio('#ffffff', theme.darkIncomingBubble) >= 4.5, `${theme.id} dark incoming bubble`);
  }
});

test('saves, applies, and restores the selected theme', () => {
  const storage = new Map<string, string>();
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const styles = new Map<string, string>();
  const root = {
    dataset: {} as DOMStringMap,
    style: { setProperty: (key: string, value: string) => styles.set(key, value) },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: root },
  });

  try {
    saveAppTheme('violet');
    assert.equal(storage.get(APP_THEME_STORAGE_KEY), 'violet');
    assert.equal(root.dataset.appTheme, 'violet');
    assert.equal(styles.get('--app-theme-accent-light'), '#7048ae');
    assert.equal(styles.get('--app-theme-accent-dark'), '#bea2f4');
    assert.equal(getSavedAppTheme(), 'violet');

    applyAppTheme('green');
    assert.equal(root.dataset.appTheme, 'green');
    assert.equal(getSavedAppTheme(), 'violet');
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
