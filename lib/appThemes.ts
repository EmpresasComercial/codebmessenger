import { logger } from './logger';

export const APP_THEME_STORAGE_KEY = 'teggram-app-color-theme';

export const APP_THEMES = [
  {
    id: 'default',
    nameKey: 'theme.name.default',
    descriptionKey: 'theme.description.default',
    accent: '#1769aa',
    surface: '#ffffff',
    chatBackground: '#ffffff',
    outgoingBubble: '#1769aa',
    darkAccent: '#5288c1',
    darkChatBackground: '#0e1621',
    darkOutgoingBubble: '#2b5278',
    darkIncomingBubble: '#182533',
    incomingBubble: '#f5f5f5',
    chatWallpaper: 'none',
    darkChatWallpaper: 'none',
    isDefault: true,
  },
  {
    id: 'classic',
    nameKey: 'theme.name.classic',
    descriptionKey: 'theme.description.classic',
    accent: '#075eaa',
    surface: '#edf6fc',
    chatBackground: '#d9ecfa',
    outgoingBubble: '#075eaa',
    darkAccent: '#83cdf4',
    darkChatBackground: '#10283b',
    darkOutgoingBubble: '#214e73',
    darkIncomingBubble: '#1b354a',
    incomingBubble: '#eaf4fb',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(circle at 18% 24%, rgba(255,255,255,.55) 0 2px, transparent 3px), radial-gradient(circle at 76% 68%, rgba(7,94,170,.08) 0 18px, transparent 19px)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(circle at 18% 24%, rgba(255,255,255,.08) 0 2px, transparent 3px), radial-gradient(circle at 76% 68%, rgba(131,205,244,.09) 0 18px, transparent 19px)",
  },
  {
    id: 'ocean',
    nameKey: 'theme.name.ocean',
    descriptionKey: 'theme.description.ocean',
    accent: '#12659b',
    surface: '#f3f9fd',
    chatBackground: '#deeffb',
    outgoingBubble: '#12659b',
    darkAccent: '#83cdf4',
    darkChatBackground: '#13283a',
    darkOutgoingBubble: '#254760',
    darkIncomingBubble: '#1c3549',
    incomingBubble: '#ffffff',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(circle at 14% 30%, rgba(18,101,155,.10) 0 22px, transparent 23px), radial-gradient(circle at 82% 70%, rgba(18,101,155,.13) 0 32px, transparent 33px), linear-gradient(135deg, rgba(255,255,255,.55), transparent 65%)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(circle at 14% 30%, rgba(131,205,244,.10) 0 22px, transparent 23px), radial-gradient(circle at 82% 70%, rgba(131,205,244,.12) 0 32px, transparent 33px)",
  },
  {
    id: 'green',
    nameKey: 'theme.name.green',
    descriptionKey: 'theme.description.green',
    accent: '#147a50',
    surface: '#faf9f4',
    chatBackground: '#f5f2eb',
    outgoingBubble: '#367653',
    darkAccent: '#73d7a8',
    darkChatBackground: '#142a20',
    darkOutgoingBubble: '#214936',
    darkIncomingBubble: '#1d382a',
    incomingBubble: '#ffffff',
    chatWallpaper: "url('/green-chat-wallpaper.svg')",
    darkChatWallpaper: "url('/green-chat-wallpaper-dark.svg')",
  },
  {
    id: 'violet',
    nameKey: 'theme.name.violet',
    descriptionKey: 'theme.description.violet',
    accent: '#7048ae',
    surface: '#f8f5fc',
    chatBackground: '#eee7f8',
    outgoingBubble: '#7048ae',
    darkAccent: '#bea2f4',
    darkChatBackground: '#241c35',
    darkOutgoingBubble: '#40315c',
    darkIncomingBubble: '#302640',
    incomingBubble: '#ffffff',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(circle at 18% 76%, rgba(112,72,174,.15) 0 30px, transparent 31px), radial-gradient(circle at 80% 20%, rgba(188,162,244,.25) 0 24px, transparent 25px), linear-gradient(135deg, rgba(255,255,255,.7), transparent 65%)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(circle at 18% 76%, rgba(190,162,244,.12) 0 30px, transparent 31px), radial-gradient(circle at 80% 20%, rgba(190,162,244,.10) 0 24px, transparent 25px)",
  },
  {
    id: 'rose',
    nameKey: 'theme.name.rose',
    descriptionKey: 'theme.description.rose',
    accent: '#ad385b',
    surface: '#fdf6f8',
    chatBackground: '#f7e8ee',
    outgoingBubble: '#ad385b',
    darkAccent: '#ff9bb8',
    darkChatBackground: '#321d27',
    darkOutgoingBubble: '#563044',
    darkIncomingBubble: '#3e2630',
    incomingBubble: '#ffffff',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(ellipse at 14% 22%, rgba(173,56,91,.11), transparent 36%), radial-gradient(ellipse at 84% 76%, rgba(255,155,184,.24), transparent 42%), linear-gradient(135deg, rgba(255,255,255,.72), transparent 68%)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(ellipse at 14% 22%, rgba(255,155,184,.12), transparent 36%), radial-gradient(ellipse at 84% 76%, rgba(255,155,184,.10), transparent 42%)",
  },
  {
    id: 'sunset',
    nameKey: 'theme.name.sunset',
    descriptionKey: 'theme.description.sunset',
    accent: '#a44300',
    surface: '#fff8ef',
    chatBackground: '#fff0dd',
    outgoingBubble: '#a44300',
    darkAccent: '#ffc18a',
    darkChatBackground: '#302115',
    darkOutgoingBubble: '#733500',
    darkIncomingBubble: '#492f1d',
    incomingBubble: '#fffaf4',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(ellipse at 14% 78%, rgba(255,142,48,.30), transparent 40%), radial-gradient(ellipse at 86% 20%, rgba(255,194,106,.38), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.7), transparent 65%)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(ellipse at 14% 78%, rgba(255,142,48,.14), transparent 40%), radial-gradient(ellipse at 86% 20%, rgba(255,194,106,.12), transparent 36%)",
  },
  {
    id: 'mint',
    nameKey: 'theme.name.mint',
    descriptionKey: 'theme.description.mint',
    accent: '#006d70',
    surface: '#f1fbf9',
    chatBackground: '#def4f0',
    outgoingBubble: '#006d70',
    darkAccent: '#74d9d3',
    darkChatBackground: '#102b2b',
    darkOutgoingBubble: '#145450',
    darkIncomingBubble: '#1b3b3a',
    incomingBubble: '#f8fffd',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(circle at 18% 25%, rgba(0,109,112,.12) 0 24px, transparent 25px), radial-gradient(circle at 82% 78%, rgba(76,183,164,.20) 0 34px, transparent 35px), linear-gradient(135deg, rgba(255,255,255,.65), transparent 68%)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(circle at 18% 25%, rgba(116,217,211,.12) 0 24px, transparent 25px), radial-gradient(circle at 82% 78%, rgba(116,217,211,.10) 0 34px, transparent 35px)",
  },
  {
    id: 'forest',
    nameKey: 'theme.name.forest',
    descriptionKey: 'theme.description.forest',
    accent: '#536b2f',
    surface: '#f7f9f0',
    chatBackground: '#e9efd9',
    outgoingBubble: '#536b2f',
    darkAccent: '#c0d68a',
    darkChatBackground: '#20291a',
    darkOutgoingBubble: '#465b27',
    darkIncomingBubble: '#303b24',
    incomingBubble: '#fcfff5',
    chatWallpaper: "url('/chat-wallpaper-pattern.svg'), radial-gradient(ellipse at 12% 22%, rgba(83,107,47,.18), transparent 38%), radial-gradient(ellipse at 90% 80%, rgba(129,153,77,.28), transparent 44%), radial-gradient(circle at 56% 48%, rgba(255,255,255,.46) 0 2px, transparent 3px)",
    darkChatWallpaper: "url('/chat-wallpaper-pattern-dark.svg'), radial-gradient(ellipse at 12% 22%, rgba(192,214,138,.12), transparent 38%), radial-gradient(ellipse at 90% 80%, rgba(192,214,138,.09), transparent 44%)",
  },
] as const;

export type AppThemeId = (typeof APP_THEMES)[number]['id'];

export function isAppThemeId(value: string | null): value is AppThemeId {
  return APP_THEMES.some((theme) => theme.id === value);
}

export function getAppTheme(themeId: AppThemeId) {
  return APP_THEMES.find((theme) => theme.id === themeId)!;
}

export function applyAppTheme(themeId: AppThemeId): void {
  const root = document.documentElement;
  const theme = getAppTheme(themeId);
  root.dataset.appTheme = themeId;
  root.style.setProperty('--app-theme-accent-light', theme.accent);
  root.style.setProperty('--app-theme-accent-dark', theme.darkAccent);
  root.style.setProperty('--app-theme-hover-light', theme.accent);
  root.style.setProperty('--app-theme-hover-dark', theme.darkAccent);
  root.style.setProperty('--app-theme-button-light', theme.accent);
  root.style.setProperty('--app-theme-button-dark', theme.accent);
  root.style.setProperty('--app-theme-surface', theme.surface);
  root.style.setProperty('--app-theme-chat-bg-light', theme.chatBackground);
  root.style.setProperty('--app-theme-chat-bg-dark', theme.darkChatBackground);
  root.style.setProperty('--app-theme-chat-wallpaper-light', theme.chatWallpaper ?? 'none');
  root.style.setProperty('--app-theme-chat-wallpaper-dark', theme.darkChatWallpaper ?? 'none');
  root.style.setProperty('--app-theme-bubble-out-light', theme.outgoingBubble);
  root.style.setProperty('--app-theme-bubble-out-dark', theme.darkOutgoingBubble);
  root.style.setProperty('--app-theme-bubble-in-dark', theme.darkIncomingBubble);
  root.style.setProperty('--app-theme-bubble-in-light', theme.incomingBubble);
}

export function getSavedAppTheme(): AppThemeId {
  try {
    const savedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY);
    return isAppThemeId(savedTheme) ? savedTheme : 'default';
  } catch (error) {
    logger.warn('AppTheme', 'Could not read the saved app theme.', error);
    return 'default';
  }
}

export function saveAppTheme(themeId: AppThemeId): void {
  localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
  applyAppTheme(themeId);
}
