import { logger } from './logger';

export const APP_ZOOM_STORAGE_KEY = 'teggram-app-zoom';
export const MIN_APP_ZOOM = 80;
export const MAX_APP_ZOOM = 120;
export const APP_ZOOM_STEP = 5;

export function clampAppZoom(value: number): number {
  return Math.min(MAX_APP_ZOOM, Math.max(MIN_APP_ZOOM, value));
}

export function applyAppZoom(value: number): void {
  document.documentElement.style.zoom = `${clampAppZoom(value)}%`;
}

export function getSavedAppZoom(): number {
  try {
    const savedZoom = Number(localStorage.getItem(APP_ZOOM_STORAGE_KEY));
    return Number.isFinite(savedZoom) && savedZoom > 0 ? clampAppZoom(savedZoom) : 100;
  } catch (error) {
    logger.warn('AppZoom', 'Could not read the saved app zoom setting.', error);
    return 100;
  }
}

export function saveAppZoom(value: number): void {
  const zoom = clampAppZoom(value);
  localStorage.setItem(APP_ZOOM_STORAGE_KEY, String(zoom));
  applyAppZoom(zoom);
}
