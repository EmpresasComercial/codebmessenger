import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  PlusCircle,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  Volume2,
  MessagesSquare,
  Monitor,
  ShieldCheck,
  Globe,
  ChevronRight,
  Star,
  HelpCircle,
  Lightbulb,
  LogOut,
  Camera,
  ChevronLeft,
  Edit3,
  Download,
  Moon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { type Language, supportedLanguages, useLanguage } from "../../contexts/LanguageContext";
import { formatCurrency } from "../../lib/currency";
import { useToast } from "../../components/Toast";
import EditProfileModal from "./components/EditProfileModal";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const {
    language,
    t,
    showLanguageSelector,
    setShowLanguageSelector,
    translateFullChats,
    setTranslateFullChats,
    notificationsMuted,
    setNotificationsMuted,
    darkMode,
    setDarkMode,
  } = useLanguage();
  const settingsSectionRef = useRef<HTMLDivElement>(null);
  const profileHeaderRef = useRef<HTMLElement>(null);
  const profileSectionRef = useRef<HTMLElement>(null);
  const selectedLanguage = supportedLanguages.find(({ code }) => code === language)!;

  const [showLanguage, setShowLanguage] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isProfileSectionHidden, setIsProfileSectionHidden] = useState(false);
  const [showBottomNavMenu, setShowBottomNavMenu] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('show_bottom_nav_menu');
    return saved === null ? true : saved === 'true';
  });
  const [balance, setBalance] = useState<number>(0);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [comissaoEquipe, setComissaoEquipe] = useState<number>(0);
  const [refCode, setRefCode] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [userBio, setUserBio] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (location.state?.openLanguage) {
      setShowLanguage(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const updateProfileHeader = () => {
      const headerBottom = profileHeaderRef.current?.getBoundingClientRect().bottom;
      const sectionBottom = profileSectionRef.current?.getBoundingClientRect().bottom;
      if (headerBottom === undefined || sectionBottom === undefined) return;
      setIsProfileSectionHidden(sectionBottom <= headerBottom);
    };

    updateProfileHeader();
    window.addEventListener('scroll', updateProfileHeader, { passive: true });
    window.addEventListener('resize', updateProfileHeader);
    return () => {
      window.removeEventListener('scroll', updateProfileHeader);
      window.removeEventListener('resize', updateProfileHeader);
    };
  }, []);

  // Busca dados reais do banco via RPC segura (SECURITY DEFINER)
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        const fName = meta.first_name || (meta.name || meta.full_name || "").split(" ")[0];
        const lName = meta.last_name || (meta.name || meta.full_name || "").split(" ").slice(1).join(" ");
        setFirstName(fName);
        setLastName(lName);
        setUserName([fName, lName].filter(Boolean).join(" "));
        if (meta.bio) setUserBio(meta.bio);
        if (meta.avatar_url) setAvatarUrl(meta.avatar_url);
      }

      const { data, error } = await supabase.rpc("get_my_account_data");
      if (!error && data && data.length > 0) {
        const d = data[0] as any;
        setBalance(Number(d.saldo_disponivel ?? 0));
        setTotalDeposits(Number(d.total_recarregado ?? 0));
        setTotalWithdrawals(Number(d.total_retirado ?? 0));
        setComissaoEquipe(Number(d.total_comissao_equipe ?? 0));
        if (d.telefone) setPhone(d.telefone);
        if (d.nome_exibicao) setUserName(d.nome_exibicao);
        if (d.codigo_meu_refferal) setRefCode(d.codigo_meu_refferal);
      }
    } catch {
      // Falha silenciosa
    }
  }, []);

  // Realtime: atualiza saldo/recargas/retiradas em tempo real
  useEffect(() => {
    fetchData();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`profile_realtime_${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sys_t500',
          filter: `id=eq.${user.id}`
        }, () => {
          fetchData();
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'renda_diaria_mcpn',
          filter: `user_id=eq.${user.id}`
        }, () => { fetchData(); })
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showToast(t('chat.logout_success'), "success");
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const toggleNotifications = () => {
    const nextMuted = !notificationsMuted;
    setNotificationsMuted(nextMuted);
    showToast(t(nextMuted ? 'group.notifications_off' : 'group.notifications_on'), 'info');

    if (nextMuted) return;
    if (!('Notification' in window)) {
      showToast(t('chat.notifications_unavailable'), 'info');
      return;
    }
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch((error: unknown) => {
        logger.error('Profile', 'Failed to request notification permission.', error);
        showToast(t('chat.notifications_error'), 'error');
      });
    }
  };

  const toggleBottomNavMenu = useCallback(() => {
    const nextValue = !showBottomNavMenu;
    setShowBottomNavMenu(nextValue);
    window.localStorage.setItem('show_bottom_nav_menu', String(nextValue));
    window.dispatchEvent(new Event('bottomNavMenuPreferenceChanged'));
  }, [showBottomNavMenu]);

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#17212b] font-sans text-black dark:text-white flex flex-col pb-24">

      {/* ── CABEÇALHO NO ESTILO OFICIAL DO TELEGRAM ── */}
      <header ref={profileHeaderRef} className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-gray-100 bg-white px-3 text-[#222222] dark:border-[#202b36] dark:bg-[#17212b] dark:text-white">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/org')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#2481cc] transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-[#202b36] dark:active:bg-[#293847]" 
            aria-label={t('common.back')}
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight">{t('profile.settings')}</h1>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowEditProfile(true)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#2481cc] transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-[#202b36] dark:active:bg-[#293847]"
            aria-label={t('profile.edit')}
            title={t('profile.edit')}
          >
            {isProfileSectionHidden ? (
              avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-[#2481cc]/30" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3390ec] text-[14px] font-semibold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )
            ) : (
              <Edit3 className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* ── AVATAR & PERFIL TELEGRAM WEB ── */}
      <section ref={profileSectionRef} className="bg-white dark:bg-[#17212b] border-b border-gray-100 dark:border-[#202b36] pt-6 pb-5 px-2 flex flex-col items-center">
        <div className="relative mb-3 cursor-pointer" onClick={() => setShowEditProfile(true)}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-[96px] h-[96px] rounded-full object-cover shadow-sm ring-4 ring-[#2481cc]/20"
            />
          ) : (
            <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-br from-[#3390ec] to-[#1e6dc8] flex items-center justify-center shadow-sm ring-4 ring-[#2481cc]/20">
              <span className="text-[38px] font-bold text-white">{firstName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditProfile(true); }}
            className="absolute bottom-0 right-0 w-[34px] h-[34px] bg-[#3390ec] rounded-full flex items-center justify-center border-[2.5px] border-white shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label={t('profile.edit')}
          >
            <Camera className="w-[16px] h-[16px] text-white" strokeWidth={2.5} />
          </button>
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-black dark:text-white mb-0.5 text-center">{userName}</h2>
        {userBio ? (
          <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] text-center max-w-[480px] mb-1">{userBio}</p>
        ) : null}
      </section>

      {/* ── LISTA DE ITENS FLAT (GRUDADO NA ESQUERDA E DIREITA COM 8px DE MARGEM) ── */}
      <main className="w-full flex-1 flex flex-col divide-y divide-gray-100/80 dark:divide-gray-800/80">

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 2: OPERAÇÕES & AÇÕES */}
        <div className="w-full bg-white dark:bg-[#17212b]">
          <SettingsItem
            icon={<Wallet className="w-5 h-5 text-white" />}
            iconBg="bg-[#0284c7]"
            title={t('chat.wallet')}
            subtitle={t('profile.wallet_subtitle')}
            onClick={() => navigate("/carteira")}
          />
          <SettingsItem
            icon={<PlusCircle className="w-5 h-5 text-white" />}
            iconBg="bg-[#10b981]"
            title={t('chat.payment_wallet')}
            subtitle={t('profile.payment_subtitle')}
            onClick={() => navigate("/sand-pay")}
          />
          <SettingsItem
            icon={<CreditCard className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title={t('chat.bank_wallet')}
            subtitle={t('profile.bank_subtitle')}
            onClick={() => navigate("/carteira?intent=add-bank")}
          />
          <SettingsItem
            icon={<Moon className="w-5 h-5 text-white" />}
            iconBg="bg-[#475569]"
            title={t('settings.dark_mode')}
            subtitle={darkMode ? t('theme.dark') : t('theme.light')}
            onClick={() => setDarkMode(!darkMode)}
            trailing={(
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                aria-label={t('settings.dark_mode')}
                onClick={(event) => {
                  event.stopPropagation();
                  setDarkMode(!darkMode);
                }}
                className="relative h-[14px] w-[34px] shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: darkMode ? '#007aff' : '#d1d1d6' }}
              >
                <span
                  className="absolute left-[-1px] top-[-3px] h-[20px] w-[20px] rounded-full border bg-white transition-transform duration-200"
                  style={{
                    transform: darkMode ? 'translateX(16px)' : 'translateX(0px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    borderColor: darkMode ? '#007aff' : '#d1d1d6',
                  }}
                />
              </button>
            )}
          />
        </div>

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 3: AJUDA & SUPORTE */}
        <div className="w-full bg-white dark:bg-[#17212b]">
          <div className="px-2 pt-3 pb-1.5">
            <span className="text-[12px] font-semibold text-[#517da2] dark:text-[#64b5f6] uppercase tracking-wider">{t('profile.help_section')}</span>
          </div>

          <SettingsItem
            icon={<Lightbulb className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#b375d6]"
            title={t('chat.introduction')}
            subtitle={t('profile.intro_subtitle')}
            onClick={() => navigate("/sobre-business")}
          />

          <SettingsItem
            icon={<HelpCircle className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title={t('chat.faq')}
            subtitle={t('profile.faq_subtitle')}
            onClick={() => navigate("/help-faq")}
          />
        </div>

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 4: DEFINIÇÕES */}
        <div ref={settingsSectionRef} className="w-full bg-white dark:bg-[#17212b]">
          <div className="px-2 pt-3 pb-1.5">
            <span className="text-[12px] font-semibold text-[#517da2] dark:text-[#64b5f6] uppercase tracking-wider">{t('profile.settings')}</span>
          </div>

          <SettingsItem
            icon={<Volume2 className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#fe384f]"
            title={t('chat.notifications')}
            subtitle={t('profile.notifications_subtitle')}
            onClick={toggleNotifications}
            trailing={(
              <button
                type="button"
                role="switch"
                aria-checked={!notificationsMuted}
                aria-label={t('chat.notifications')}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleNotifications();
                }}
                className="relative h-[14px] w-[34px] shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: notificationsMuted ? '#d1d1d6' : '#007aff' }}
              >
                <span
                  className="absolute left-[-1px] top-[-3px] h-[20px] w-[20px] rounded-full border bg-white transition-transform duration-200"
                  style={{
                    transform: notificationsMuted ? 'translateX(0px)' : 'translateX(16px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    borderColor: notificationsMuted ? '#d1d1d6' : '#007aff',
                  }}
                />
              </button>
            )}
          />

          <SettingsItem
            icon={<Download className="w-5 h-5 text-white" />}
            iconBg="bg-[#e95171]"
            title={t('chat.download_apk')}
            subtitle={t('profile.download_subtitle')}
            onClick={() => navigate("/android?setln=pt")}
          />

          <SettingsItem
            icon={<Monitor className="w-5 h-5 text-white" />}
            iconBg="bg-[#7c8dff]"
            title="Controle do menu"
            subtitle={showBottomNavMenu ? 'Ativado' : 'Desativado'}
            onClick={toggleBottomNavMenu}
            trailing={(
              <button
                type="button"
                role="switch"
                aria-checked={showBottomNavMenu}
                aria-label="Controle do menu"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleBottomNavMenu();
                }}
                className="relative h-[14px] w-[34px] shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: showBottomNavMenu ? '#007aff' : '#d1d1d6' }}
              >
                <span
                  className="absolute left-[-1px] top-[-3px] h-[20px] w-[20px] rounded-full border bg-white transition-transform duration-200"
                  style={{
                    transform: showBottomNavMenu ? 'translateX(16px)' : 'translateX(0px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    borderColor: showBottomNavMenu ? '#007aff' : '#d1d1d6',
                  }}
                />
              </button>
            )}
          />

          <SettingsItem
            icon={<Globe className="w-5 h-5 text-white" />}
            iconBg="bg-[#b375d6]"
            title={t('settings.language')}
            subtitle={selectedLanguage.nativeName}
            onClick={() => setShowLanguage(true)}
          />

          <SettingsItem
            icon={<ShieldAlert className="w-5 h-5 text-white" />}
            iconBg="bg-[#2481cc]"
            title={t('chat.reset_password')}
            subtitle={t('profile.password_subtitle')}
            onClick={() => navigate("/alterar-senha")}
          />

          <SettingsItem
            icon={<Monitor className="w-5 h-5 text-white" />}
            iconBg="bg-[#2481cc]"
            title={t('devices.active_sessions')}
            subtitle={t('devices.active_sessions_subtitle')}
            onClick={() => navigate("/sessoes-ativas")}
          />

          <SettingsItem
            icon={<ShieldCheck className="w-5 h-5 text-white" />}
            iconBg="bg-[#46c2ca]"
            title={t('chat.terms_privacy')}
            subtitle={t('profile.privacy_subtitle')}
            onClick={() => navigate("/privacidade")}
          />

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-2 py-3.5 text-left hover:bg-red-50/50 dark:hover:bg-red-950/20 active:bg-red-50 transition-colors cursor-pointer"
          >
            <div className="w-[34px] h-[34px] rounded-[10px] bg-red-500 flex items-center justify-center shrink-0 mr-3.5">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-red-600 dark:text-red-400">{t('chat.logout')}</span>
          </button>
        </div>

      </main>

      {/* MODAL DE IDIOMA */}
      {showLanguage && (
        <div className="fixed inset-0 z-50 bg-[#f1f1f2] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {/* Header do Modal */}
            <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10 border-b border-gray-200/60">
              <button onClick={() => setShowLanguage(false)} className="mr-3 p-1 rounded-full active:opacity-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M5 12l7-7M5 12l7 7" />
                </svg>
              </button>
              <span className="text-[18px] font-bold flex-1">{t('settings.language')}</span>
            </div>

            <div className="px-3 flex flex-col gap-4 pb-12 pt-3">
              {/* Traduzir Mensagens Card */}
              <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[13px] font-semibold text-[#2481cc]">{t('profile.translate_messages')}</span>
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
                  <span className="text-[15px] text-black">{t('profile.do_not_translate')}</span>
                  <span className="text-[13px] font-medium text-[#2481cc]">{t('settings.languages_count')}</span>
                </div>
              </div>

              {/* Lista de Idiomas */}
              <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[13px] font-semibold text-[#2481cc]">{t('settings.language')}</span>
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
        </div>
      )}

      {/* MODAL EDITAR PERFIL */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        initialData={{ firstName, lastName, bio: userBio, avatarUrl, phone }}
        totalDeposits={totalDeposits}
        totalWithdrawals={totalWithdrawals}
        comissaoEquipe={comissaoEquipe}
        onSaved={({ firstName: fn, lastName: ln, bio: b, avatarUrl: av }) => {
          setFirstName(fn);
          setLastName(ln);
          setUserName([fn, ln].filter(Boolean).join(" "));
          setUserBio(b);
          setAvatarUrl(av);
        }}
      />

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
══════════════════════════════════════════════════════════════ */
function SettingsItem({
  icon,
  iconBg,
  title,
  subtitle,
  isLast = false,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  isLast?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={`w-full flex items-center px-2 py-3 hover:bg-gray-50/80 dark:hover:bg-white/5 active:bg-gray-100 cursor-pointer transition-colors ${
        !isLast ? "border-b border-gray-100/70 dark:border-gray-800/70" : ""
      }`}
      onClick={onClick}
    >
      <div className={`w-[34px] h-[34px] rounded-[10px] ${iconBg} flex items-center justify-center shrink-0 mr-3.5 shadow-2xs`}>
        {icon}
      </div>
      <div className="flex-1 flex flex-col justify-center py-0.5 min-w-0">
        <span className="text-[15px] font-medium text-black dark:text-white leading-tight mb-0.5 truncate">{title}</span>
        {subtitle && (
          <span className="text-[12.5px] font-normal text-[#8e8e93] dark:text-[#8e9aa5] leading-tight truncate">
            {subtitle}
          </span>
        )}
      </div>
      {trailing ?? (onClick && <ChevronRight className="w-4 h-4 text-[#c7c7cc] dark:text-gray-600 shrink-0 ml-auto" />)}
    </div>
  );
}

function TranslateRow({
  label,
  defaultOn = false,
  checked,
  onChange,
}: {
  label: string;
  defaultOn?: boolean;
  checked?: boolean;
  onChange?: (on: boolean) => void;
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
      <span className="text-[15px] text-black">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        onClick={toggle}
        className={`w-[44px] h-[26px] rounded-full transition-colors relative cursor-pointer ${
          isOn ? "bg-[#2481cc]" : "bg-gray-300"
        }`}
      >
        <div
          className={`w-[22px] h-[22px] bg-white rounded-full shadow absolute top-0.5 transition-all ${
            isOn ? "left-[20px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function LangRow({
  label,
  sub,
  code,
  isLast = false,
}: {
  label: string;
  sub: string;
  code: Language;
  isLast?: boolean;
}) {
  const { language, setLanguage } = useLanguage();
  const isSelected = language === code;
  const handleClick = () => setLanguage(code);
  return (
    <div
      className={`flex items-center px-4 py-3 ${
        !isLast ? "border-b border-[#e5e5e5]" : ""
      } cursor-pointer hover:bg-gray-50 active:bg-gray-100`}
      onClick={handleClick}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <div
        className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center mr-3.5 shrink-0 ${
          isSelected ? "border-[#2481cc]" : "border-gray-300"
        }`}
      >
        {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-[#2481cc]" />}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[15px] font-medium text-black leading-tight">{label}</span>
        <span className="text-[12.5px] text-[#8e8e93]">{sub}</span>
      </div>
    </div>
  );
}
