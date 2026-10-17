import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from './Toast';
import {
  APP_ZOOM_STEP,
  applyAppZoom,
  getSavedAppZoom,
  MAX_APP_ZOOM,
  MIN_APP_ZOOM,
  saveAppZoom,
} from '../lib/appZoom';

type ZoomSettingsModalProps = {
  onClose: () => void;
};

export default function ZoomSettingsModal({ onClose }: ZoomSettingsModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [savedZoom] = useState(getSavedAppZoom);
  const [zoom, setZoom] = useState(savedZoom);

  const updateZoom = (value: number) => {
    const nextZoom = Math.min(MAX_APP_ZOOM, Math.max(MIN_APP_ZOOM, value));
    setZoom(nextZoom);
    applyAppZoom(nextZoom);
  };

  const closeWithoutSaving = () => {
    applyAppZoom(savedZoom);
    onClose();
  };

  const save = () => {
    try {
      saveAppZoom(zoom);
      onClose();
    } catch (error) {
      showToast(t('zoom.save_failed'), 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeWithoutSaving();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="zoom-settings-title"
        className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-5 text-[#17212b] shadow-xl dark:border-[#263341] dark:bg-[#17212b] dark:text-white"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="zoom-settings-title" className="text-lg font-semibold">
            {t('zoom.title')}
          </h2>
          <button
            type="button"
            onClick={closeWithoutSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={t('zoom.cancel')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-7 text-sm text-[#52606d] dark:text-[#c4cbd2]">
          {t('zoom.description')}
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => updateZoom(zoom - APP_ZOOM_STEP)}
            disabled={zoom <= MIN_APP_ZOOM}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf4fb] text-[#2481cc] disabled:opacity-40 dark:bg-white/10 dark:text-[#6ab3f3]"
            aria-label={t('zoom.decrease')}
          >
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={MIN_APP_ZOOM}
            max={MAX_APP_ZOOM}
            step={APP_ZOOM_STEP}
            value={zoom}
            onChange={(event) => updateZoom(Number(event.target.value))}
            className="min-w-0 flex-1 accent-[#2481cc]"
            aria-label={t('zoom.title')}
            aria-valuetext={`${zoom}%`}
          />
          <button
            type="button"
            onClick={() => updateZoom(zoom + APP_ZOOM_STEP)}
            disabled={zoom >= MAX_APP_ZOOM}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf4fb] text-[#2481cc] disabled:opacity-40 dark:bg-white/10 dark:text-[#6ab3f3]"
            aria-label={t('zoom.increase')}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="my-5 text-center text-sm font-medium" aria-live="polite">
          {zoom}%
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={closeWithoutSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#52606d] hover:bg-black/5 dark:text-[#c4cbd2] dark:hover:bg-white/10"
          >
            {t('zoom.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-[#2481cc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e6eb0]"
          >
            {t('zoom.save')}
          </button>
        </div>
      </section>
    </div>
  );
}
