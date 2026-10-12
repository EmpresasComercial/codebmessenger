import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Search, MoreVertical, Camera, CreditCard, MessageSquare, ShieldAlert, 
  Volume2, Building2, MessagesSquare, Smartphone, Globe, ChevronRight,
  Star, Store, Gift, HelpCircle, Lightbulb, Lock
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const [showLanguage, setShowLanguage] = useState(false);

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
          <button className="active:opacity-50"><Search className="w-5 h-5" strokeWidth={2.5} /></button>
          <button className="active:opacity-50"><MoreVertical className="w-5 h-5" strokeWidth={2.5} /></button>
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
            title="Conta"
            subtitle="Adicionar cartão bancário"
            onClick={() => navigate('/adicionar-banco')}
          />
          
          <SettingsItem 
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#f2a93b]"
            title="Chat Settings"
            subtitle="Wallpaper, Night Mode, Animations"
            onClick={() => navigate('/adicionar-banco')}
          />
          
          <SettingsItem 
            icon={<ShieldAlert className="w-5 h-5 text-white" />}
            iconBg="bg-[#25D366]"
            title="Redefinir Senha de Segurança"
            subtitle="Altere a sua senha de acesso"
            onClick={() => navigate('/alterar-senha')}
          />

          <SettingsItem 
            icon={<Volume2 className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#fe384f]"
            title="Notifications"
            subtitle="Sounds, Calls, Badges"
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission();
              }
            }}
          />

          <SettingsItem 
            icon={<Building2 className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title="Informações Bancárias"
            subtitle="Ver conta bancária adicionada"
            onClick={() => navigate('/informacao-bancaria')}
          />

          <SettingsItem 
            icon={<MessagesSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title="Pastas de Chat"
            subtitle="Aceder ao chat da comunidade"
            onClick={() => navigate('/org')}
          />

          <SettingsItem 
            icon={<Smartphone className="w-5 h-5 text-white" />}
            iconBg="bg-[#46c2ca]"
            title="Termos de uso e privacidade"
            subtitle="Ver versão e actualizar a aplicação"
            onClick={() => navigate('/devices')}
          />

          <SettingsItem 
            icon={<Globe className="w-5 h-5 text-white" />}
            iconBg="bg-[#b375d6]"
            title="Idioma"
            subtitle="Português (Brasil)"
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
            title="Send a Gift"
            isLast={true}
          />
        </div>

        {/* CARD 3: AJUDA */}
        <div className="bg-white rounded-[16px] overflow-hidden mb-6">
          <div className="px-4 py-2 pt-3">
            <span className="text-[14px] font-semibold text-[#00a884] tracking-wide">Ajuda</span>
          </div>

          <SettingsItem 
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#f2a93b]"
            title="Fazer uma Pergunta"
            onClick={() => navigate('/org')}
          />

          <SettingsItem 
            icon={<HelpCircle className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title="Perguntas Frequentes"
            onClick={() => navigate('/help-faq')}
          />

          <SettingsItem 
            icon={<Lightbulb className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#b375d6]"
            title="Recursos do Telegram"
            isLast={true}
          />
        </div>

      </main>

      {/* LANGUAGE MODAL - Full screen Telegram style */}
      {showLanguage && (
        <div className="fixed inset-0 z-50 bg-[#f1f1f2] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0">
            <button onClick={() => setShowLanguage(false)} className="mr-4 active:opacity-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
              </svg>
            </button>
            <span className="text-[18px] font-semibold flex-1">Idioma</span>
            <button className="active:opacity-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>

          <div className="px-3 flex flex-col gap-4 pb-10">
            {/* Traduzir Mensagens card */}
            <div className="bg-white rounded-[16px] overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <span className="text-[13px] font-semibold text-[#25D366]">Traduzir Mensagens</span>
              </div>
              <TranslateRow label="Mostrar o Botão Traduzir" defaultOn={true} />
              <TranslateRow label="Traduzir Chats Inteiros" locked={true} />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[16px] text-black">Não Traduzir</span>
                <span className="text-[14px] font-medium text-[#25D366]">3 Idiomas</span>
              </div>
            </div>
            <p className="text-[13px] text-[#8e8e93] px-2 -mt-2">
              O botão 'Traduzir' aparecerá quando você tocar uma vez em uma mensagem de texto.
            </p>

            {/* Language list card */}
            <div className="bg-white rounded-[16px] overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <span className="text-[13px] font-semibold text-[#25D366]">Idioma</span>
              </div>
              <LangRow label="Português (Brasil)" sub="Portuguese (Brazil)" code="pt" available />
              <LangRow label="English" sub="English" code="en" available />
              <LangRow label="Français" sub="French" code="fr" available />
              <LangRow label="العربية" sub="Arabic" code="ar" />
              <LangRow label="Беларуская" sub="Belarusian" code="be" />
              <LangRow label="Català" sub="Catalan" code="ca" />
              <LangRow label="简体中文" sub="Chinese (Simplified)" code="zh-hans" />
              <LangRow label="繁體中文" sub="Chinese (Traditional)" code="zh-hant" isLast />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Toggle row for translation settings
function TranslateRow({ label, defaultOn = false, locked = false }: { label: string; defaultOn?: boolean; locked?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
      <span className="text-[16px] text-black">{label}</span>
      {locked ? (
        <div className="w-[48px] h-[28px] rounded-full bg-gray-300 flex items-center justify-center relative">
          <div className="w-[24px] h-[24px] bg-white rounded-full shadow flex items-center justify-center absolute left-0.5">
            <Lock className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOn(!on)}
          className={`w-[48px] h-[28px] rounded-full transition-colors relative ${on ? 'bg-[#25D366]' : 'bg-gray-300'}`}
        >
          <div className={`w-[24px] h-[24px] bg-white rounded-full shadow absolute top-0.5 transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  );
}

// Language row
function LangRow({ label, sub, code, available = false, isLast = false }: { label: string; sub: string; code: string; available?: boolean; isLast?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const isSelected = language === code;
  const handleClick = () => { if (available) setLanguage(code as any); };
  return (
    <div
      className={`flex items-center px-4 py-3 ${!isLast ? 'border-b border-[#e5e5e5]' : ''} ${available ? 'cursor-pointer active:bg-gray-50' : 'opacity-60 cursor-default'}`}
      onClick={handleClick}
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
        {!available && <span className="text-[11px] text-[#c7c7cc] font-light">indisponível</span>}
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
