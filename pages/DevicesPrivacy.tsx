import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Language, useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { COUNTRIES } from '../lib/countries';
import { logger } from '../lib/logger';
import {
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Clock,
  Globe,
  Copy,
  Check,
  RotateCcw,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Monitor,
} from 'lucide-react';

interface AuditSession {
  id: number | string;
  ip_address: string;
  action_type: string;
  success: boolean;
  details?: Record<string, any>;
  created_at: string;
}

type NavigatorWithDeviceModel = Navigator & {
  userAgentData?: {
    model?: string;
  };
};

const DATE_LOCALE: Record<Language, string> = {
  pt: 'pt-PT',
  en: 'en-GB',
  fr: 'fr-FR',
  ar: 'ar',
  'zh-hans': 'zh-CN',
  es: 'es-ES',
};

function getDeviceInfo(t: ReturnType<typeof useLanguage>['t']) {
  if (typeof navigator === 'undefined') {
    return { os: t('devices.web_browser'), name: t('devices.web_browser'), browser: 'Web', isMobile: false };
  }
  const ua = navigator.userAgent;
  let os = t('devices.connected_device');
  let isMobile = false;

  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) { os = 'Android'; isMobile = true; }
  else if (/iphone|ipad|ipod/i.test(ua)) { os = 'iOS (Apple)'; isMobile = true; }
  else if (/linux/i.test(ua)) os = 'Linux';

  const browserModel = (navigator as NavigatorWithDeviceModel).userAgentData?.model?.trim();
  const androidModel = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i)?.[1]?.trim();
  const candidateModel = browserModel || androidModel;
  const deviceModel = candidateModel && !/^(android|linux|k|wv)$/i.test(candidateModel)
    ? candidateModel
    : undefined;
  const name = deviceModel || (
    os === 'Android' ? 'Android' :
    os === 'iOS (Apple)' ? (/ipad/i.test(ua) ? 'iPad' : 'iPhone') :
    os
  );

  let browser = t('devices.web_browser');
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua)) browser = 'Apple Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { os, name, browser, isMobile };
}

function ActiveDeviceIllustration({ isMobile }: { isMobile: boolean }) {
  return (
    <div aria-hidden="true" className="mb-4 h-[220px] w-full overflow-hidden">
      {isMobile ? (
        <div className="relative mx-auto h-[286px] w-[min(240px,calc(100%-48px))]">
          <div className="h-full rounded-[32px] border border-slate-400/90 bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 p-[3px] shadow-[0_5px_14px_rgba(15,23,42,.16)]">
            <div className="h-full overflow-hidden rounded-[27px] border border-slate-800/80 bg-white">
              <div className="relative flex h-7 items-center justify-between bg-white px-3 text-[9px] font-semibold text-slate-900">
                <span>9:41</span>
                <span className="absolute left-1/2 top-1 h-4 w-12 -translate-x-1/2 rounded-full bg-[#07090b]" />
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-[2px] border border-slate-800" />
                  <span className="h-2 w-2 rounded-[2px] bg-slate-800" />
                </span>
              </div>
              <div className="flex h-10 items-center gap-2 border-b border-slate-100 bg-white px-3">
                <img src="/logo_tegx.jfif" alt="" className="h-6 w-6 rounded-full object-cover" />
                <span className="h-2 w-20 rounded-full bg-slate-300" />
                <span className="ml-auto h-1.5 w-5 rounded-full bg-slate-200" />
              </div>
              <div className="space-y-3 bg-slate-50 px-3 py-4">
                <div className="ml-auto h-8 w-4/5 rounded-2xl rounded-br-sm bg-sky-100" />
                <div className="h-10 w-4/5 rounded-2xl rounded-bl-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,.08)]" />
                <div className="ml-auto h-8 w-3/5 rounded-2xl rounded-br-sm bg-sky-100" />
                <div className="h-10 w-3/4 rounded-2xl rounded-bl-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,.08)]" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mx-auto h-[260px] w-full max-w-[560px]">
          <div className="h-[244px] rounded-t-[22px] border border-slate-400/90 bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 p-[4px] shadow-[0_5px_14px_rgba(15,23,42,.16)]">
            <div className="h-full overflow-hidden rounded-t-[17px] border border-slate-800/80 bg-white">
              <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="mx-auto flex h-5 w-2/3 max-w-[300px] items-center justify-center rounded-md bg-white text-[8px] text-slate-400 shadow-sm">
                  teggram-x.com
                </span>
                <Monitor className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="flex h-[196px] bg-white">
                <aside className="w-[27%] border-r border-slate-100 bg-slate-50 p-3">
                  <div className="mb-4 flex items-center gap-2">
                    <img src="/logo_tegx.jfif" alt="" className="h-5 w-5 rounded-full object-cover" />
                    <span className="h-1.5 w-12 rounded-full bg-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-7 rounded-lg bg-sky-100" />
                    <div className="h-7 rounded-lg bg-slate-100" />
                    <div className="h-7 rounded-lg bg-slate-100" />
                  </div>
                </aside>
                <div className="flex-1 px-4 py-4">
                  <div className="mb-4 h-2 w-24 rounded-full bg-slate-200" />
                  <div className="ml-auto mb-3 h-8 w-3/5 rounded-xl rounded-br-sm bg-sky-100" />
                  <div className="mb-3 h-9 w-3/5 rounded-xl rounded-bl-sm bg-slate-100" />
                  <div className="ml-auto h-8 w-2/5 rounded-xl rounded-br-sm bg-sky-100" />
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto h-3 w-[18%] rounded-b-md bg-gradient-to-b from-slate-400 to-slate-300" />
        </div>
      )}
    </div>
  );
}

export default function DevicesPrivacy() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const localDeviceId = getDeviceId();
  const deviceInfo = getDeviceInfo(t);

  const [dbDeviceId, setDbDeviceId] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('');
  const [currentIp, setCurrentIp] = useState<string>('');
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const accountCountry = useMemo(() => {
    const code = countryCode || session?.user.user_metadata?.country_code || 'AO';
    const country = COUNTRIES.find(
      (item) => item.code.toUpperCase() === code.toUpperCase(),
    );

    if (!country) return t('devices.country_unavailable');

    try {
      return new Intl.DisplayNames([DATE_LOCALE[language]], { type: 'region' }).of(country.code)
        || country.name;
    } catch {
      return country.name;
    }
  }, [language, countryCode, session?.user.user_metadata?.country_code, t]);

  const fetchDeviceData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const user = session?.user;
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Uma única chamada RPC: regista atividade + busca dados de dispositivo e sessões
      const { data, error } = await (supabase.rpc as any)('get_my_devices_sessions_mcpn', {
        p_device_id: localDeviceId,
        p_details: {
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
        },
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setDbDeviceId(row.current_device_id || localDeviceId);
          if (row.country_code) setCountryCode(row.country_code);
          if (row.current_ip) setCurrentIp(row.current_ip);
          if (Array.isArray(row.sessions)) {
            setSessions(row.sessions);
          }
        }
      } else {
        logger.warn('DevicesPrivacy', 'RPC retornou vazio ou erro:', error);
      }
    } catch (err: any) {
      logger.error('DevicesPrivacy', 'Falha ao carregar dispositivos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, localDeviceId, deviceInfo.os, deviceInfo.browser]);

  useEffect(() => {
    fetchDeviceData();
  }, [fetchDeviceData]);

  const handleCopyDeviceId = () => {
    const idToCopy = dbDeviceId || localDeviceId;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    showToast(t('devices.device_id_copied'), 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleTerminateOtherSessions = async () => {
    setTerminating(true);
    try {
      // 1. Invoca encerramento de outras sessões no banco
      const { error } = await (supabase.rpc as any)('terminate_other_sessions_mcpn', {
        p_current_device_id: dbDeviceId || localDeviceId,
      });

      if (error) {
        throw error;
      }

      // 2. Invoca signOut com scope: 'others' no cliente Supabase
      try {
        await supabase.auth.signOut({ scope: 'others' });
      } catch (authErr) {
        logger.warn('DevicesPrivacy', 'signOut others scope fallback:', authErr);
      }

      showToast(t('devices.sessions_terminated'), 'success');
      setShowConfirmModal(false);
      await fetchDeviceData(true);
    } catch (err: any) {
      logger.error('DevicesPrivacy', 'Erro ao encerrar sessões:', err);
      showToast(t('devices.terminate_failed'), 'error');
    } finally {
      setTerminating(false);
    }
  };

  const formatSessionDate = (dateStr?: string) => {
    if (!dateStr) return t('devices.recent');
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(DATE_LOCALE[language], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const activeDeviceId = dbDeviceId || localDeviceId;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-white dark:bg-[#0e1621] font-sans text-[#222] dark:text-[#f5f5f5] select-none">
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#e6e8eb] dark:border-white/10 bg-white dark:bg-[#0e1621] px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#707579] dark:text-[#8e9aa5] transition hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[17px] font-medium tracking-tight text-black dark:text-white">
              {t('devices.active_sessions')}
            </h1>
            <span className="text-[11.5px] text-[#707579] dark:text-[#8e9aa5]">
              {t('devices.active_sessions_subtitle')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchDeviceData(true)}
          disabled={refreshing || loading}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#2481cc] hover:bg-[#2481cc]/10 active:scale-95 transition cursor-pointer"
          title={t('devices.refresh_sessions')}
        >
          <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 sm:px-6 py-2">
        <ActiveDeviceIllustration isMobile={deviceInfo.isMobile} />
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#2481cc] animate-spin" />
            <span className="text-[13.5px] text-[#707579] dark:text-[#8e9aa5]">
              {t('devices.loading_sessions')}
            </span>
          </div>
        ) : (
          <>
            <section className="border-b border-[#e6e8eb] dark:border-white/10 py-5 space-y-4">
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-medium text-black dark:text-white truncate">
                      {deviceInfo.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#29b85e]/15 text-[#29b85e]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#29b85e] animate-pulse" />
                      {t('chat.online_now')}
                    </span>
                  </div>

                  <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] mt-0.5">
                    {deviceInfo.browser} • Teggram-X
                  </p>

                </div>
              </div>

              {/* Informações técnicas da sessão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 text-[12.5px]">
                <div className="flex items-center justify-between sm:justify-start gap-2 py-2 border-b border-[#edf0f2] dark:border-white/5">
                  <span className="text-[#707579] dark:text-[#8e9aa5] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#2481cc]" />
                    {t('devices.current_ip')}
                  </span>
                  <span className="font-mono font-semibold text-black dark:text-white truncate">
                    {currentIp || t('devices.ip_protected')}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2 py-2 border-b border-[#edf0f2] dark:border-white/5">
                  <span className="text-[#707579] dark:text-[#8e9aa5] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#29b85e]" />
                    {t('devices.country')}
                  </span>
                  <span className="font-medium text-[#29b85e]">
                    {accountCountry}
                  </span>
                </div>
              </div>

              {/* Identificador do dispositivo com Cópia Rápida */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11.5px] font-normal text-[#707579] dark:text-[#8e9aa5]">
                  {t('devices.device_id')}
                </label>
                <div className="flex items-center justify-between gap-2 border-b border-[#edf0f2] dark:border-white/5 py-2 font-mono text-[12px] text-black dark:text-white">
                  <span className="truncate">{activeDeviceId}</span>
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="p-1.5 text-[#2481cc] transition active:scale-95 shrink-0 cursor-pointer"
                    title={t('devices.copy_device_id')}
                  >
                    {copiedId ? <Check className="w-4 h-4 text-[#29b85e]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#e6e8eb] dark:border-white/10 py-5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[#e53935] font-semibold text-[14.5px]">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t('password.security')}</span>
                </div>
                <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5] max-w-[420px]">
                  {t('devices.suspicious_activity')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-1 py-2 text-[#e53935] font-medium text-[13.5px] transition active:scale-95 cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('devices.terminate_other_sessions')}</span>
              </button>
            </section>

            <section className="border-b border-[#e6e8eb] dark:border-white/10">
              <div className="py-4 border-b border-[#e6e8eb] dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2481cc]" />
                  <h3 className="text-[14px] font-medium text-black dark:text-white">
                    {t('devices.access_history')}
                  </h3>
                </div>
                <span className="text-[12px] font-semibold text-[#707579] dark:text-[#8e9aa5]">
                  {t(sessions.length === 1 ? 'devices.session_count_one' : 'devices.session_count_many').replace('{count}', String(sessions.length))}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-[#29b85e] mx-auto opacity-75" />
                  <p className="text-[14px] font-medium text-black dark:text-white">
                    {t('devices.no_other_sessions')}
                  </p>
                  <p className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] max-w-sm mx-auto">
                    {t('devices.only_current_device')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#e6e8eb] dark:divide-white/10">
                  {sessions.map((sess) => {
                    const isCurrent = currentIp && sess.ip_address.includes(currentIp);
                    const sessDevice = sess.details?.device_id || '';
                    const isSameDev = sessDevice && sessDevice === activeDeviceId;

                    return (
                      <div
                        key={sess.id}
                        className="py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                            isCurrent || isSameDev
                              ? 'bg-[#2481cc]/15 text-[#2481cc]'
                              : 'bg-black/5 dark:bg-white/10 text-[#707579] dark:text-[#9eaab6]'
                          }`}>
                            <Globe className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13.5px] font-semibold text-black dark:text-white truncate">
                                {sess.ip_address}
                              </span>
                              {(isCurrent || isSameDev) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2481cc]/15 text-[#2481cc] uppercase">
                                  {t('devices.current')}
                                </span>
                              )}
                            </div>

                            <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5] truncate mt-0.5">
                              {sess.action_type === 'session_active'
                                ? t('devices.session_active')
                                : sess.action_type === 'registration_check_success'
                                ? t('devices.registration_verified')
                                : sess.action_type === 'session_terminated'
                                ? t('devices.session_ended')
                                : sess.action_type}
                              {' • '}
                              {formatSessionDate(sess.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 text-right">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            sess.action_type === 'session_terminated'
                              ? 'bg-[#e53935]'
                              : sess.success
                              ? 'bg-[#29b85e]'
                              : 'bg-[#f2a93b]'
                          }`} />
                          <span className="text-[11.5px] text-[#707579] dark:text-[#8e9aa5] font-medium hidden sm:inline">
                            {sess.action_type === 'session_terminated'
                              ? t('devices.status_ended')
                              : sess.success
                              ? t('devices.status_verified')
                              : t('devices.status_alert')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </>
        )}
      </main>

      {/* ── MODAL DE CONFIRMAÇÃO PARA ENCERRAR SESSÕES ── */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => !terminating && setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#17212b] rounded-2xl p-5 shadow-2xl border border-black/10 dark:border-white/10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#e53935]">
              <div className="w-10 h-10 rounded-full bg-[#e53935]/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#e53935]" />
              </div>
              <h3 className="text-[16px] font-bold text-black dark:text-white">
                {t('devices.terminate_confirm_title')}
              </h3>
            </div>

            <p className="text-[13.5px] text-[#707579] dark:text-[#8e9aa5] leading-relaxed">
              {t('devices.terminate_confirm_message')}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={terminating}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-[13.5px] font-semibold text-[#707579] dark:text-[#8e9aa5] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={terminating}
                onClick={handleTerminateOtherSessions}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13.5px] font-semibold bg-[#e53935] text-white hover:bg-[#d32f2f] transition shadow-md shadow-[#e53935]/25 cursor-pointer disabled:opacity-50"
              >
                {terminating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>                    {t('devices.terminating')}</span>
                  </>
                ) : (
                  <span>                  {t('devices.confirm_terminate')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
