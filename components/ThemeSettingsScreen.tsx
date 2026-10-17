import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from './Toast';
import { APP_THEMES, type AppThemeId, applyAppTheme, getSavedAppTheme, saveAppTheme } from '../lib/appThemes';

type ThemeSettingsScreenProps = {
  onClose: () => void;
  onSaved?: (theme: AppThemeId) => void;
};

export default function ThemeSettingsScreen({ onClose, onSaved }: ThemeSettingsScreenProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [savedTheme] = useState<AppThemeId>(getSavedAppTheme);
  const [selectedTheme, setSelectedTheme] = useState<AppThemeId>(savedTheme);
  const [isSaving, setIsSaving] = useState(false);
  const hasSavedTheme = useRef(false);

  useEffect(() => () => {
    if (!hasSavedTheme.current) applyAppTheme(savedTheme);
  }, [savedTheme]);

  const closeWithoutSaving = () => {
    applyAppTheme(savedTheme);
    onClose();
  };

  const save = () => {
    setIsSaving(true);
    try {
      saveAppTheme(selectedTheme);
      hasSavedTheme.current = true;
      onSaved?.(selectedTheme);
      onClose();
    } catch (error) {
      showToast(t('theme.save_failed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex flex-col bg-[#f0f2f5] text-[#17212b] dark:bg-[#0e1621] dark:text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-settings-title"
    >
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-3 dark:border-white/10 dark:bg-[#17212b]">
        <button
          type="button"
          onClick={closeWithoutSaving}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#52606d] hover:bg-black/5 dark:text-[#c4cbd2] dark:hover:bg-white/10"
          aria-label={t('theme.back')}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 id="theme-settings-title" className="truncate text-[17px] font-semibold">
            {t('theme.title')}
          </h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="mx-auto mb-4 max-w-xl text-sm leading-5 text-[#52606d] dark:text-[#c4cbd2]">
          {t('theme.description')}
        </p>

        <div className="mx-auto grid max-w-xl grid-cols-1 gap-y-2 pb-5 sm:grid-cols-2 sm:gap-x-4">
          {APP_THEMES.map((theme) => {
            const selected = selectedTheme === theme.id;
            return (
              <ThemeOption
                key={theme.id}
                theme={theme}
                selected={selected}
                name={t(theme.nameKey)}
                description={t(theme.descriptionKey)}
                onSelect={() => {
                  setSelectedTheme(theme.id);
                  applyAppTheme(theme.id);
                }}
              />
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 border-t border-black/5 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 dark:border-white/10 dark:bg-[#17212b]">
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="theme-apply-button mx-auto flex h-11 w-full max-w-xl items-center justify-center px-5 text-sm font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-60"
        >
          {t('theme.save')}
        </button>
      </footer>
    </div>
  );
}

function ThemeOption({
  theme,
  selected,
  name,
  description,
  onSelect,
}: {
  theme: (typeof APP_THEMES)[number];
  selected: boolean;
  name: string;
  description: string;
  onSelect: () => void;
}) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`theme-option-button min-w-0 overflow-hidden border-0 border-b-2 bg-transparent text-left transition-colors ${
        selected ? 'bg-black/[0.035] dark:bg-white/[0.045]' : 'hover:bg-black/[0.025] dark:hover:bg-white/[0.035]'
      }`}
      style={{ borderBottomColor: selected ? theme.accent : 'transparent' }}
    >
      <div className="theme-preview-device relative mx-auto mt-3 w-[min(100%-24px,164px)] bg-[#17191c] p-[4px]">
        <div className="theme-preview-screen flex h-full flex-col overflow-hidden">
          <div
            className="relative flex h-6 items-center justify-between px-3 text-[6px] font-semibold text-white"
            style={{ backgroundColor: theme.accent }}
          >
            <span>9:41</span>
            <span className="absolute left-1/2 top-1/2 h-[13px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#090a0b]" />
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-2.5 rounded-[2px] border border-white/80" />
              <span className="h-1.5 w-2 rounded-[2px] bg-white/90" />
            </span>
          </div>
          <div
            className="flex h-8 items-center gap-1.5 px-2 text-[8px] font-semibold text-white"
            style={{ backgroundColor: theme.accent }}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px]"
              style={{ backgroundColor: 'rgba(255,255,255,.24)' }}
            >
              {t(theme.nameKey).slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate">{t('theme.preview_title')}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          </div>
          <div
            className="theme-preview-chat flex h-[126px] min-h-0 flex-col gap-2 bg-cover p-2"
            style={{
              backgroundColor: theme.chatBackground,
              backgroundImage: theme.chatWallpaper ?? 'none',
              backgroundSize: theme.id === 'green' ? '160px 160px' : '140px 140px, cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="max-w-[82%] self-start rounded-[7px] rounded-tl-sm px-2 py-1.5 text-[7px] leading-tight text-[#17212b]"
              style={{
                backgroundColor: theme.incomingBubble,
                border: '1px solid rgba(23,33,43,.06)',
              }}
            >
              {t('theme.preview_incoming')}
            </div>
            <div
              className="theme-preview-outgoing max-w-[84%] self-end rounded-[7px] rounded-br-sm px-2 py-1.5 text-[7px] leading-tight text-white"
              style={{ backgroundColor: theme.outgoingBubble }}
            >
              <span>{t('theme.preview_outgoing')}</span>
              <span className="ml-1 whitespace-nowrap text-[6px] opacity-80">12:40 ✓✓</span>
            </div>
            <div className="mt-auto flex h-6 items-center gap-1.5 rounded-full bg-white px-2 text-[6px] text-[#707579]">
              <span className="h-2.5 w-2.5 rounded-full border border-[#aab4bf]" />
              <span className="flex-1">{t('theme.preview_input')}</span>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
            </div>
          </div>
          <div className="flex h-5 items-center justify-around bg-white text-[6px] text-[#707579]">
            <span>{t('theme.preview_tab_chats')}</span>
            <span>{t('theme.preview_tab_contacts')}</span>
            <span>{t('theme.preview_tab_settings')}</span>
          </div>
          <div className="flex h-3 items-center justify-center bg-white">
            <span className="h-0.5 w-8 rounded-full bg-[#17212b]" />
          </div>
        </div>
      </div>

      <div className="flex min-h-[78px] items-start gap-2 px-2.5 py-2">
        <span
          className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2"
          style={{
            borderColor: selected ? theme.accent : '#aab4bf',
            backgroundColor: selected ? theme.accent : 'transparent',
            boxShadow: selected ? 'inset 0 0 0 2px white' : undefined,
          }}
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-[#52606d] dark:text-[#aab4bf]">
            {description}
          </span>
        </span>
      </div>
    </button>
  );
}
