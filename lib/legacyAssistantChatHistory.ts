import { logger } from './logger';

const LEGACY_LOCAL_HISTORY_KEYS = [
  'telegram_withdraw_bot_v2',
  'telegram_botfather_chat_v3',
] as const;

export function clearLegacyAssistantChatHistory(): void {
  for (const key of LEGACY_LOCAL_HISTORY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('AssistantChatHistory', `Could not clear legacy history key "${key}":`, error);
    }
  }
}
