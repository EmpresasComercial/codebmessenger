import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const DEFAULT_PROFILE_AVATAR = '/avatar_padrao_bm.jpg?v=2';
export const PAYMENT_BOT_AVATAR = '/payment_bot_avatar.jpg?v=1';
export const WITHDRAWAL_BOT_AVATAR = '/withdrawal_bot_avatar.jpg?v=1';
export const COMMUNITY_CHAT_AVATAR = '/community-group-logo.svg?v=1';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProfileAvatarUrl(profile: any): string {
  let metadata = profile?.metadados;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }

  return profile?.avatar_url
    || profile?.avatarUrl
    || profile?.foto_url
    || profile?.photo_url
    || profile?.avatar
    || profile?.imagem
    || metadata?.avatar_url
    || metadata?.foto_url
    || metadata?.photo_url
    || metadata?.picture
    || DEFAULT_PROFILE_AVATAR;
}
