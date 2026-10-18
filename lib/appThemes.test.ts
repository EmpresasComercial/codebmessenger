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
import translations from '../contexts/translations/supplemental';

test('accepts only theme ids defined in the app palette', () => {
  for (const theme of APP_THEMES) {
    assert.equal(isAppThemeId(theme.id), true);
  }

  assert.equal(isAppThemeId('unknown'), false);
  assert.equal(isAppThemeId(null), false);
});

test('provides every visible theme-page translation in all supported languages', () => {
  const pageKeys = [
    'theme.title',
    'theme.description',
    'theme.save',
    'theme.back',
    'theme.save_failed',
    'theme.preview_title',
    'theme.preview_incoming',
    'theme.preview_outgoing',
    'theme.preview_input',
    'theme.preview_tab_chats',
    'theme.preview_tab_contacts',
    'theme.preview_tab_settings',
    ...APP_THEMES.flatMap((theme) => [theme.nameKey, theme.descriptionKey]),
  ];

  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of pageKeys) {
      assert.ok(Object.hasOwn(dictionary, key), `${language} is missing ${key}`);
    }
  }
});

test('keeps the original white theme visually distinct from the blue theme', () => {
  const defaultTheme = APP_THEMES.find((theme) => theme.id === 'default')!;
  const blueTheme = APP_THEMES.find((theme) => theme.id === 'classic')!;

  assert.equal(defaultTheme.chatBackground, '#ffffff');
  assert.equal(defaultTheme.surface, '#ffffff');
  assert.notEqual(blueTheme.accent, defaultTheme.accent);
  assert.notEqual(blueTheme.surface, defaultTheme.surface);
  assert.notEqual(blueTheme.chatBackground, defaultTheme.chatBackground);
  assert.notEqual(blueTheme.outgoingBubble, defaultTheme.outgoingBubble);
});

test('provides unique patterned wallpapers for the added conversation themes', () => {
  for (const themeId of ['sunset', 'mint', 'forest'] as const) {
    const theme = APP_THEMES.find((item) => item.id === themeId)!;
    assert.notEqual(theme.chatWallpaper, 'none');
    assert.notEqual(theme.darkChatWallpaper, 'none');
  }
});

test('adds illustrated wallpaper to every non-default theme only', () => {
  const defaultTheme = APP_THEMES.find((theme) => theme.id === 'default')!;
  assert.equal(defaultTheme.chatWallpaper, 'none');
  assert.equal(defaultTheme.darkChatWallpaper, 'none');

  for (const theme of APP_THEMES.filter((item) => item.id !== 'default')) {
    assert.notEqual(theme.chatWallpaper, 'none', `${theme.id} light wallpaper`);
    assert.notEqual(theme.darkChatWallpaper, 'none', `${theme.id} dark wallpaper`);
    if (theme.id !== 'green') {
      assert.match(theme.chatWallpaper, /chat-wallpaper-pattern\.svg/);
      assert.match(theme.darkChatWallpaper, /chat-wallpaper-pattern-dark\.svg/);
    }
  }
});

test('matches the green theme to the provided chat screenshot colors', () => {
  const greenTheme = APP_THEMES.find((theme) => theme.id === 'green')!;

  assert.equal(greenTheme.chatBackground, '#f5f2eb');
  assert.equal(greenTheme.incomingBubble, '#ffffff');
  assert.equal(greenTheme.outgoingBubble, '#367653');
  assert.equal(greenTheme.chatWallpaper, "url('/green-chat-wallpaper.svg')");
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
    assert.ok(contrastRatio('#17212b', theme.incomingBubble) >= 4.5, `${theme.id} light incoming bubble`);
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
    assert.equal(styles.get('--app-theme-chat-wallpaper-light'), APP_THEMES.find((theme) => theme.id === 'violet')!.chatWallpaper);
    assert.equal(styles.get('--app-theme-chat-wallpaper-dark'), APP_THEMES.find((theme) => theme.id === 'violet')!.darkChatWallpaper);
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
