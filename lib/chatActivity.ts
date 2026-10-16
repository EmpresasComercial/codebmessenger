export interface ChatActivity {
  timestamp: number;
}

export const CHAT_ACTIVITY_EVENT = 'business-messenger:chat-activity';

const getStorageKey = (userId: string) => `bm_chat_activity_${userId}`;

export function loadChatActivities(userId?: string): Record<string, ChatActivity> {
  if (!userId || typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) as Record<string, ChatActivity> : {};
  } catch (error) {
    console.error('Não foi possível carregar a atividade recente dos chats:', error);
    return {};
  }
}

export function recordChatActivity(userId: string | undefined, chatId: string): void {
  if (!userId || typeof window === 'undefined') return;

  const activity = { timestamp: Date.now() };
  try {
    const activities = loadChatActivities(userId);
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify({ ...activities, [chatId]: activity }),
    );
  } catch (error) {
    console.error('Não foi possível guardar a atividade recente do chat:', error);
  }

  window.dispatchEvent(new CustomEvent(CHAT_ACTIVITY_EVENT, {
    detail: { userId, chatId, activity },
  }));
}
