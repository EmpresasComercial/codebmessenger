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
    isDefault: true,
  },
  {
    id: 'classic',
    nameKey: 'theme.name.classic',
    descriptionKey: 'theme.description.classic',
    accent: '#1769aa',
    surface: '#ffffff',
    chatBackground: '#eaf3fa',
    outgoingBubble: '#1769aa',
    darkAccent: '#5288c1',
    darkChatBackground: '#0e1621',
    darkOutgoingBubble: '#2b5278',
    darkIncomingBubble: '#182533',
    incomingBubble: '#f5f5f5',
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
  },
  {
    id: 'green',
    nameKey: 'theme.name.green',
    descriptionKey: 'theme.description.green',
    accent: '#147a50',
    surface: '#f3faf6',
    chatBackground: '#e0f1e7',
    outgoingBubble: '#147a50',
    darkAccent: '#73d7a8',
    darkChatBackground: '#142a20',
    darkOutgoingBubble: '#214936',
    darkIncomingBubble: '#1d382a',
    incomingBubble: '#ffffff',
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
