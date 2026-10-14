import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Language, supportedLanguages, useLanguage } from '../contexts/LanguageContext';
import { 
  Search, MoreVertical, Camera, CreditCard, MessageSquare, ShieldAlert, 
  Volume2, Building2, MessagesSquare, Smartphone, Globe, ChevronRight,
  Star, Store, Gift, HelpCircle, Lightbulb
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const {
    language,
    t,
    showLanguageSelector,
    setShowLanguageSelector,
    translateFullChats,
    setTranslateFullChats,
  } = useLanguage();
  const [showLanguage, setShowLanguage] = useState(false);
  const selectedLanguage = supportedLanguages.find(({ code }) => code === language)!;

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-24 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="w-full px-4 pt-4 pb-2 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#fff8ec] flex items-center justify-center">
            <Star className="w-5 h-5 text-[#f2a93b] fill-[#f2a93b]" />
          </div>
          <span className="text-[18px] font-bold text-black tracking-tight">Telegram Premium</span>
        </div>
        <div className="flex items-center gap-3 text-black">
          <button className="active:opacity-50" aria-label={t('chat.search')}><Search className="w-5 h-5" strokeWidth={2.5} /></button>
          <button className="active:opacity-50" aria-label={t('chat.open_menu')}><MoreVertical className="w-5 h-5" strokeWidth={2.5} /></button>
        </div>
      </header>

      {/* PROFILE SECTION */}
      <section className="flex flex-col items-center mt-2 mb-6 px-4">
        <div className="relative mb-3">
          <img 
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop" 
            alt="Thomas Hall" 
            className="w-[100px] h-[100px] rounded-full object-cover shadow-sm"
          />
          <div className="absolute bottom-0 right-0 w-[30px] h-[30px] bg-[#25D366] rounded-full flex items-center justify-center border-[3px] border-[#f1f1f2]">
            <Camera className="w-[14px] h-[14px] text-white fill-white" />
          </div>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-black mb-0.5">Thomas Hall</h1>
        <p className="text-[14px] text-[#8e8e93]">
          +244 941465064 • @Asiaray_Thomas_Hall
        </p>
      </section>

      <main className="px-3 flex flex-col gap-4">
        
        {/* CARD 1: SETTINGS */}
        <div className="bg-white rounded-[16px] overflow-hidden">
          
          <SettingsItem 
            icon={<CreditCard className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title={t('profile.account')}
            subtitle={t('settings.add_bank_card')}
            onClick={() => navigate('/carteira?intent=add-bank')}
          />
          
          <SettingsItem 
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#f2a93b]"
            title={t('chat.settings')}
            subtitle={t('settings.chat_appearance')}
            onClick={() => navigate('/bank')}
          />
          
          <SettingsItem 
            icon={<ShieldAlert className="w-5 h-5 text-white" />}
            iconBg="bg-[#25D366]"
            title={t('settings.security_password')}
            subtitle={t('profile.password_subtitle')}
            onClick={() => navigate('/alterar-senha')}
          />

          <SettingsItem 
            icon={<Volume2 className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#fe384f]"
            title={t('chat.notifications')}
            subtitle={t('settings.notification_options')}
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission();
              }
            }}
          />

          <SettingsItem 
            icon={<Building2 className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title={t('profile.bank_info')}
            subtitle={t('settings.view_bank_account')}
            onClick={() => navigate('/informacao-bancaria')}
          />

          <SettingsItem 
            icon={<MessagesSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title={t('settings.chat_folders')}
            subtitle={t('settings.open_community')}
            onClick={() => navigate('/org')}
          />

          <SettingsItem 
            icon={<Smartphone className="w-5 h-5 text-white" />}
            iconBg="bg-[#46c2ca]"
            title={t('devices.title')}
            subtitle={t('profile.privacy_subtitle')}
            onClick={() => navigate('/devices')}
          />

          <SettingsItem 
            icon={<Globe className="w-5 h-5 text-white" />}
            iconBg="bg-[#b375d6]"
            title={t('settings.language')}
            subtitle={selectedLanguage.nativeName}
            isLast={true}
            onClick={() => setShowLanguage(true)}
          />
        </div>

        {/* CARD 2: PREMIUM / STARS */}
        <div className="bg-white rounded-[16px] overflow-hidden">
          <SettingsItem 
            icon={<Star className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#8d54d9]"
            title="Telegram Premium"
          />
          
          <SettingsItem 
            icon={<Star className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#f2a93b]"
            title="Telegram Stars"
          />

          <SettingsItem 
            icon={<Store className="w-5 h-5 text-white" />}
            iconBg="bg-[#e95171]"
            title="Telegram Business"
          />

          <SettingsItem 
            icon={<Gift className="w-5 h-5 text-white" />}
            iconBg="bg-[#f2a93b]"
            title={t('settings.send_gift')}
            isLast={true}
          />
        </div>

        {/* CARD 3: AJUDA */}
        <div className="bg-white rounded-[16px] overflow-hidden mb-6">
          <div className="px-4 py-2 pt-3">
            <span className="text-[14px] font-semibold text-[#00a884] tracking-wide">{t('profile.help_section')}</span>
          </div>

          <SettingsItem 
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#f2a93b]"
            title={t('settings.ask_question')}
            onClick={() => navigate('/org')}
          />

          <SettingsItem 
            icon={<HelpCircle className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title={t('settings.faq')}
            onClick={() => navigate('/help-faq')}
          />

          <SettingsItem 
            icon={<Lightbulb className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#b375d6]"
            title={t('settings.telegram_resources')}
            isLast={true}
          />
        </div>

      </main>

      {/* LANGUAGE MODAL - Full screen Telegram style */}
      {showLanguage && (
        <div className="fixed inset-0 z-50 bg-[#f1f1f2] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0">
            <button onClick={() => setShowLanguage(false)} className="mr-4 active:opacity-50" aria-label={t('common.back')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
              </svg>
            </button>
            <span className="text-[18px] font-semibold flex-1">{t('settings.language')}</span>
            <button className="active:opacity-50" aria-label={t('chat.search')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>

          <div className="px-3 flex flex-col gap-4 pb-10">
            {/* Traduzir Mensagens card */}
            <div className="bg-white rounded-[16px] overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <span className="text-[13px] font-semibold text-[#25D366]">{t('profile.translate_messages')}</span>
              </div>
              <TranslateRow
                label={t('profile.show_translate_button')}
                checked={showLanguageSelector}
                onChange={setShowLanguageSelector}
              />
              <TranslateRow
                label={t('profile.translate_full_chats')}
                checked={translateFullChats}
                onChange={setTranslateFullChats}
              />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[16px] text-black">{t('profile.do_not_translate')}</span>
                <span className="text-[14px] font-medium text-[#25D366]">{t('settings.languages_count')}</span>
              </div>
            </div>
            <p className="text-[13px] text-[#8e8e93] px-2 -mt-2">
              {t('settings.translate_button_hint')}
            </p>

            {/* Language list card */}
            <div className="bg-white rounded-[16px] overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <span className="text-[13px] font-semibold text-[#25D366]">{t('settings.language')}</span>
              </div>
              <div role="radiogroup" aria-label={t('settings.language')}>
                {supportedLanguages.map(({ code, name, nativeName }, index) => (
                  <LangRow
                    key={code}
                    label={nativeName}
                    sub={name}
                    code={code}
                    isLast={index === supportedLanguages.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Toggle row for translation settings
function TranslateRow({
  label,
  defaultOn = false,
  checked,
  onChange,
}: {
  label: string;
  defaultOn?: boolean;
  checked?: boolean;
  onChange?: (enabled: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  const isOn = checked ?? on;
  const toggle = () => {
    const next = !isOn;
    if (onChange) onChange(next);
    else setOn(next);
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
      <span className="text-[16px] text-black">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        onClick={toggle}
        className={`w-[48px] h-[28px] rounded-full transition-colors relative ${isOn ? 'bg-[#25D366]' : 'bg-gray-300'}`}
      >
        <div className={`w-[24px] h-[24px] bg-white rounded-full shadow absolute top-0.5 transition-all ${isOn ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

// Language row
function LangRow({ label, sub, code, isLast = false }: { label: string; sub: string; code: Language; isLast?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const isSelected = language === code;
  const handleClick = () => setLanguage(code);
  return (
    <div
      className={`flex items-center px-4 py-3 cursor-pointer active:bg-gray-50 ${!isLast ? 'border-b border-[#e5e5e5]' : ''}`}
      onClick={handleClick}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Radio */}
      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center mr-4 shrink-0 ${
        isSelected ? 'border-[#25D366]' : 'border-gray-300'
      }`}>
        {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-[#25D366]" />}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[16px] text-black leading-tight">{label}</span>
        <span className="text-[13px] text-[#8e8e93]">{sub}</span>
      </div>
    </div>
  );
}

// Reusable Settings Item Component
function SettingsItem({ 
  icon, 
  iconBg, 
  title, 
  subtitle, 
  isLast = false,
  onClick
}: { 
  icon: React.ReactNode, 
  iconBg: string, 
  title: string, 
  subtitle?: string, 
  isLast?: boolean,
  onClick?: () => void
}) {
  return (
    <div 
      className="flex items-center px-4 py-2.5 active:bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      <div className={`w-[32px] h-[32px] rounded-[10px] ${iconBg} flex items-center justify-center shrink-0 mr-4`}>
        {icon}
      </div>
      <div className={`flex-1 flex flex-col justify-center py-1 ${!isLast ? 'border-b border-[#e5e5e5]' : ''}`}>
        <span className="text-[16px] font-normal text-black leading-tight mb-0.5">{title}</span>
        {subtitle && (
          <span className="text-[13px] font-normal text-[#8e8e93] leading-tight truncate">
            {subtitle}
          </span>
        )}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-[#c7c7cc] shrink-0 ml-2" />}
    </div>
  );
}
