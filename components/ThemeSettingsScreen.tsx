import { useState } from 'react';
import { Check, ChevronLeft, Palette } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from './Toast';
import { APP_THEMES, type AppThemeId, getAppTheme, getSavedAppTheme, saveAppTheme } from '../lib/appThemes';

type ThemeSettingsScreenProps = {
  onClose: () => void;
  onSaved?: (theme: AppThemeId) => void;
};

export default function ThemeSettingsScreen({ onClose, onSaved }: ThemeSettingsScreenProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<AppThemeId>(getSavedAppTheme);
  const [isSaving, setIsSaving] = useState(false);

  const save = () => {
    setIsSaving(true);
    try {
      saveAppTheme(selectedTheme);
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
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#52606d] hover:bg-black/5 dark:text-[#c4cbd2] dark:hover:bg-white/10"
          aria-label={t('theme.back')}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 id="theme-settings-title" className="truncate text-[17px] font-semibold">
            {t('theme.title')}
          </h1>
          <p className="truncate text-xs text-[#52606d] dark:text-[#aab4bf]">
            {t('theme.subtitle')}
          </p>
        </div>
        <Palette className="h-5 w-5 shrink-0 text-[#2481cc] dark:text-[#6ab3f3]" aria-hidden="true" />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="mx-auto mb-4 max-w-xl text-sm leading-5 text-[#52606d] dark:text-[#c4cbd2]">
          {t('theme.description')}
        </p>

        <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 pb-5">
          {APP_THEMES.map((theme) => {
            const selected = selectedTheme === theme.id;
            return (
              <ThemeOption
                key={theme.id}
                theme={theme}
                selected={selected}
                name={t(theme.nameKey)}
                description={t(theme.descriptionKey)}
                onSelect={() => setSelectedTheme(theme.id)}
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
          className="mx-auto flex h-11 w-full max-w-xl items-center justify-center gap-2 rounded-lg bg-[#2481cc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1f72b5] disabled:cursor-wait disabled:opacity-60"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
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
      className={`theme-option-button min-w-0 overflow-hidden border-2 bg-white text-left transition-shadow dark:bg-[#17212b] ${
        selected
          ? 'border-[#2481cc] shadow-[0_0_0_2px_rgba(36,129,204,0.16)]'
          : 'border-transparent shadow-sm hover:shadow-md'
      }`}
    >
      <div className="theme-preview-device mx-auto mt-3 w-[min(100%-24px,150px)] overflow-hidden border-[3px] border-[#253342] shadow-md">
        <div className="flex h-5 items-center justify-center bg-[#253342]">
          <span className="h-1 w-8 rounded-full bg-white/50" />
        </div>
        <div
          className="flex h-7 items-center gap-1.5 px-2 text-[8px] font-semibold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          <span className="h-3 w-3 rounded-full bg-white/25" />
          <span>{t('theme.preview_title')}</span>
        </div>
        <div className="flex h-[116px] flex-col gap-2 p-2" style={{ backgroundColor: theme.chatBackground }}>
          <div className="w-[74%] self-start bg-white px-1.5 py-1 text-[7px] leading-tight text-[#17212b] shadow-sm">
            {t('theme.preview_incoming')}
          </div>
          <div
            className="w-[76%] self-end px-1.5 py-1 text-[7px] leading-tight text-white shadow-sm"
            style={{ backgroundColor: theme.outgoingBubble }}
          >
            {t('theme.preview_outgoing')}
          </div>
          <div className="mt-auto flex h-5 items-center rounded-full bg-white px-2 text-[6px] text-[#707579]">
            {t('theme.preview_input')}
          </div>
        </div>
        <div className="flex h-5 items-center justify-around bg-white text-[6px] text-[#707579]">
          <span>{t('theme.preview_tab_chats')}</span>
          <span>{t('theme.preview_tab_contacts')}</span>
          <span>{t('theme.preview_tab_settings')}</span>
        </div>
      </div>

      <div className="flex min-h-[58px] items-start gap-2 px-2.5 py-2">
        <span
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2"
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
