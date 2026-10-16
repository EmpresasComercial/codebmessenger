import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  PlusCircle,
  CreditCard,
  ShieldAlert,
  Volume2,
  Monitor,
  ShieldCheck,
  Globe,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  LogOut,
  ChevronLeft,
  UserRoundPen,
  Download,
  Moon,
  Fingerprint,
  Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { type Language, supportedLanguages, useLanguage } from "../../contexts/LanguageContext";
import { DEFAULT_PROFILE_AVATAR, getProfileAvatarUrl } from "../../lib/utils";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../contexts/AuthContext";

const EditProfileModal = lazy(() => import("./components/EditProfileModal"));

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { session } = useAuth();
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
  const profileHeaderRef = useRef<HTMLElement>(null);
  const profileAvatarRef = useRef<HTMLImageElement>(null);
  const selectedLanguage = supportedLanguages.find(({ code }) => code === language) ?? supportedLanguages[0];
  const initialMetadata = session?.user.user_metadata ?? {};
  const initialFullName = typeof initialMetadata.name === "string"
    ? initialMetadata.name
    : typeof initialMetadata.full_name === "string" ? initialMetadata.full_name : "";
  const initialFirstName = typeof initialMetadata.first_name === "string"
    ? initialMetadata.first_name
    : initialFullName.split(" ")[0];
  const initialLastName = typeof initialMetadata.last_name === "string"
    ? initialMetadata.last_name
    : initialFullName.split(" ").slice(1).join(" ");

  const [showLanguage, setShowLanguage] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isProfileAvatarHidden, setIsProfileAvatarHidden] = useState(false);
  const [showBottomNavMenu, setShowBottomNavMenu] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('show_bottom_nav_menu');
    return saved === null ? true : saved === 'true';
  });
  const [userName, setUserName] = useState(initialFullName || [initialFirstName, initialLastName].filter(Boolean).join(" "));
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [userBio, setUserBio] = useState(typeof initialMetadata.bio === "string" ? initialMetadata.bio : "");
  const [avatarUrl, setAvatarUrl] = useState(getProfileAvatarUrl(initialMetadata));

  useEffect(() => {
    const metadata = session?.user.user_metadata;
    if (!metadata) return;

    const fullName = typeof metadata.name === "string"
      ? metadata.name
      : typeof metadata.full_name === "string" ? metadata.full_name : "";
    const nextFirstName = typeof metadata.first_name === "string"
      ? metadata.first_name
      : fullName.split(" ")[0];
    const nextLastName = typeof metadata.last_name === "string"
      ? metadata.last_name
      : fullName.split(" ").slice(1).join(" ");

    setFirstName(nextFirstName);
    setLastName(nextLastName);
    setUserName(fullName || [nextFirstName, nextLastName].filter(Boolean).join(" "));
    setUserBio(typeof metadata.bio === "string" ? metadata.bio : "");
    setAvatarUrl(getProfileAvatarUrl(metadata));
  }, [session?.user.id, session?.user.user_metadata]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    let isCurrent = true;
    const loadProfileDetails = async () => {
      const { data, error } = await supabase
        .from("sys_t500")
        .select("nome_exibicao, avatar_url, metadados")
        .eq("id", userId)
        .maybeSingle();

      if (!isCurrent) return;
      if (error) {
        logger.warn("Profile", "Could not load profile details from database.", error);
        return;
      }
      if (!data) return;

      if (data.nome_exibicao) {
        const [dbFirstName, ...dbLastName] = data.nome_exibicao.trim().split(/\s+/);
        setUserName(data.nome_exibicao);
        setFirstName(dbFirstName || "");
        setLastName(dbLastName.join(" "));
      }
      setAvatarUrl(getProfileAvatarUrl(data));
    };

    void loadProfileDetails();
    return () => {
      isCurrent = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (location.state?.openLanguage) {
      setShowLanguage(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const updateProfileHeader = () => {
      const headerBottom = profileHeaderRef.current?.getBoundingClientRect().bottom;
      const avatarBottom = profileAvatarRef.current?.getBoundingClientRect().bottom;
      if (headerBottom === undefined || avatarBottom === undefined) return;
      setIsProfileAvatarHidden(avatarBottom <= headerBottom);
    };

    updateProfileHeader();
    window.addEventListener('scroll', updateProfileHeader, { passive: true });
    window.addEventListener('resize', updateProfileHeader);
    return () => {
      window.removeEventListener('scroll', updateProfileHeader);
      window.removeEventListener('resize', updateProfileHeader);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showToast(t('chat.logout_success'), "success");
      navigate("/signin");
    } catch {
      navigate("/signin");
    }
  };

  const handleRegisterPasskey = async () => {
    if (!session?.user) {
      showToast(t('passkey.register_failed'), 'error');
      return;
    }
    if (!window.isSecureContext || !window.PublicKeyCredential) {
      showToast(t('passkey.unavailable'), 'error');
      return;
    }

    setIsRegisteringPasskey(true);
    try {
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      if (!data) throw new Error(t('passkey.register_failed'));

      showToast(t('passkey.register_success'), 'success');
    } catch (error: unknown) {
      logger.error('Profile', 'Failed to register a passkey.', error);
      const detail = error instanceof Error ? ` ${error.message}` : '';
      showToast(`${t('passkey.register_failed')}${detail}`, 'error');
    } finally {
      setIsRegisteringPasskey(false);
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
            {isProfileAvatarHidden ? (
              avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
                  }}
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3390ec] text-[14px] font-semibold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )
            ) : (
              <UserRoundPen className="h-[21px] w-[21px]" strokeWidth={1.9} />
            )}
          </button>
        </div>
      </header>

      <section className="bg-white dark:bg-[#17212b] border-b border-gray-100 dark:border-[#202b36] pt-6 pb-5 px-2 flex flex-col items-center">
        <div className="relative mb-3">
          <img
            ref={profileAvatarRef}
            src={avatarUrl}
            alt={userName}
            className="h-[108px] w-[108px] rounded-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
            }}
          />
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-black dark:text-white mb-0.5 text-center">{userName}</h2>
        {userBio ? (
          <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] text-center max-w-[480px] mb-1">{userBio}</p>
        ) : null}
      </section>

      <main className="w-full flex-1 flex flex-col">
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

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

        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

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

        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        <div className="w-full bg-white dark:bg-[#17212b]">
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
            title={t('settings.menu_control')}
            subtitle={showBottomNavMenu ? t('settings.enabled') : t('settings.disabled')}
            onClick={toggleBottomNavMenu}
            trailing={(
              <button
                type="button"
                role="switch"
                aria-checked={showBottomNavMenu}
                aria-label={t('settings.menu_control')}
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
            icon={<Fingerprint className="w-5 h-5 text-white" />}
            iconBg="bg-[#46c2ca]"
            title={t('passkey.title')}
            subtitle={t('passkey.subtitle')}
            onClick={isRegisteringPasskey ? undefined : handleRegisterPasskey}
            trailing={isRegisteringPasskey
              ? <Loader2 className="w-4 h-4 text-[#2481cc] animate-spin ml-auto" />
              : undefined}
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

      {showLanguage && (
        <div className="fixed inset-0 z-50 bg-[#f1f1f2] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10 border-b border-gray-200/60">
              <button onClick={() => setShowLanguage(false)} className="mr-3 p-1 rounded-full active:opacity-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M5 12l7-7M5 12l7 7" />
                </svg>
              </button>
              <span className="text-[18px] font-bold flex-1">{t('settings.language')}</span>
            </div>

            <div className="px-3 flex flex-col gap-4 pb-12 pt-3">
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

      {showEditProfile && (
        <Suspense fallback={null}>
          <EditProfileModal
            isOpen
            onClose={() => setShowEditProfile(false)}
            initialData={{ firstName, lastName, bio: userBio, avatarUrl }}
            onSaved={({ firstName: fn, lastName: ln, bio: b, avatarUrl: av }) => {
              setFirstName(fn);
              setLastName(ln);
              setUserName([fn, ln].filter(Boolean).join(" "));
              setUserBio(b);
              setAvatarUrl(av);
            }}
          />
        </Suspense>
      )}

    </div>
  );
}

function SettingsItem({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className="w-full flex cursor-pointer items-center border-b border-[#e5e5e5] px-2 py-3 transition-colors hover:bg-gray-50/80 active:bg-gray-100 dark:border-[#263341] dark:hover:bg-white/5"
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
