import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { logger } from '../lib/logger';
import {
  Smartphone,
  Monitor,
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
} from 'lucide-react';

interface AuditSession {
  id: number | string;
  ip_address: string;
  action_type: string;
  success: boolean;
  details?: Record<string, any>;
  created_at: string;
}

function getDeviceInfo() {
  if (typeof navigator === 'undefined') {
    return { os: 'Navegador Web', browser: 'Web', isMobile: false };
  }
  const ua = navigator.userAgent;
  let os = 'Dispositivo Conectado';
  let isMobile = false;

  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) { os = 'Android'; isMobile = true; }
  else if (/iphone|ipad|ipod/i.test(ua)) { os = 'iOS (Apple)'; isMobile = true; }
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Web Browser';
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua)) browser = 'Apple Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { os, browser, isMobile };
}

export default function DevicesPrivacy() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const localDeviceId = getDeviceId();
  const deviceInfo = getDeviceInfo();

  const [dbDeviceId, setDbDeviceId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [currentIp, setCurrentIp] = useState<string>('');
  const [sessions, setSessions] = useState<AuditSession[]>([]);

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

      // 1. Registra a atividade da sessão atual no backend
      try {
        const { data: actData } = await (supabase.rpc as any)('record_device_activity_mcpn', {
          p_device_id: localDeviceId,
          p_details: {
            os: deviceInfo.os,
            browser: deviceInfo.browser,
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
            screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
          },
        });
        if ((actData as any)?.ip) {
          setCurrentIp((actData as any).ip);
        }
      } catch (actErr) {
        logger.warn('DevicesPrivacy', 'Erro ao sincronizar sessão:', actErr);
      }

      // 2. Busca dados de dispositivo e sessões via RPC segura
      const { data, error } = await (supabase.rpc as any)('get_my_devices_sessions_mcpn');

      if (!error && Array.isArray(data) && data.length > 0) {
        const row = data[0];
        setDbDeviceId(row.current_device_id || localDeviceId);
        setPhone(row.telefone || '');
        if (Array.isArray(row.sessions)) {
          setSessions(row.sessions);
        }
      } else {
        // Fallback: consulta direta caso a RPC retorne vazio
        const { data: userAcc } = await supabase
          .from('sys_t500')
          .select('metadados, telefone')
          .eq('id', user.id)
          .maybeSingle();

        if (userAcc) {
          const meta = userAcc.metadados as Record<string, any> | null;
          setDbDeviceId(meta?.device_id || localDeviceId);
          setPhone(userAcc.telefone || '');
        }

        const { data: auditRows } = await supabase
          .from('ip_audit_mcpn')
          .select('id, ip_address, action_type, success, details, created_at')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (Array.isArray(auditRows)) {
          setSessions(
            auditRows.map((r: any) => ({
              id: r.id,
              ip_address: typeof r.ip_address === 'string' ? r.ip_address.replace(/\/32$/, '') : 'IP Seguro',
              action_type: r.action_type || 'Sessão',
              success: Boolean(r.success),
              details: r.details,
              created_at: r.created_at,
            }))
          );
        }
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
    showToast('Identificador do dispositivo copiado!', 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleTerminateOtherSessions = async () => {
    setTerminating(true);
    try {
      // 1. Invoca encerramento de outras sessões no banco
      const { data, error } = await (supabase.rpc as any)('terminate_other_sessions_mcpn', {
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

      showToast((data as any)?.message || 'Todas as outras sessões foram encerradas com sucesso!', 'success');
      setShowConfirmModal(false);
      await fetchDeviceData(true);
    } catch (err: any) {
      logger.error('DevicesPrivacy', 'Erro ao encerrar sessões:', err);
      showToast(err.message || 'Não foi possível encerrar as outras sessões.', 'error');
    } finally {
      setTerminating(false);
    }
  };

  const formatSessionDate = (dateStr?: string) => {
    if (!dateStr) return 'Recente';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-PT', {
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
    <div className="flex min-h-[100dvh] w-full flex-col bg-white dark:bg-[#0e1621] font-sans text-[#222] dark:text-[#f5f5f5]">
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
          title="Atualizar sessões"
        >
          <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 sm:px-6 py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#2481cc] animate-spin" />
            <span className="text-[13.5px] text-[#707579] dark:text-[#8e9aa5]">
              Carregando auditoria de dispositivos...
            </span>
          </div>
        ) : (
          <>
            <section className="border-b border-[#e6e8eb] dark:border-white/10 py-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 flex items-center justify-center text-[#2481cc] shrink-0">
                  {deviceInfo.isMobile ? (
                    <Smartphone className="w-6 h-6" />
                  ) : (
                    <Monitor className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-medium text-black dark:text-white truncate">
                      {deviceInfo.os}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#29b85e]/15 text-[#29b85e]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#29b85e] animate-pulse" />
                      Ativo agora
                    </span>
                  </div>

                  <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] mt-0.5">
                    {deviceInfo.browser} • Business Messenger
                  </p>

                  {phone && (
                    <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5] mt-0.5">
                      Conta vinculada: <span className="font-medium text-black dark:text-white">+{phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Informações técnicas da sessão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 text-[12.5px]">
                <div className="flex items-center justify-between sm:justify-start gap-2 py-2 border-b border-[#edf0f2] dark:border-white/5">
                  <span className="text-[#707579] dark:text-[#8e9aa5] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#2481cc]" />
                    IP Atual:
                  </span>
                  <span className="font-mono font-semibold text-black dark:text-white truncate">
                    {currentIp || 'Conexão Protegida'}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2 py-2 border-b border-[#edf0f2] dark:border-white/5">
                  <span className="text-[#707579] dark:text-[#8e9aa5] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#29b85e]" />
                    Auditoria:
                  </span>
                  <span className="font-medium text-[#29b85e]">
                    Autenticado & Seguro
                  </span>
                </div>
              </div>

              {/* Identificador do dispositivo com Cópia Rápida */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11.5px] font-normal text-[#707579] dark:text-[#8e9aa5]">
                  ID do Dispositivo (Device ID)
                </label>
                <div className="flex items-center justify-between gap-2 border-b border-[#edf0f2] dark:border-white/5 py-2 font-mono text-[12px] text-black dark:text-white">
                  <span className="truncate">{activeDeviceId}</span>
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="p-1.5 text-[#2481cc] transition active:scale-95 shrink-0 cursor-pointer"
                    title="Copiar Device ID"
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
                  <span>Segurança da Conta</span>
                </div>
                <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5] max-w-[420px]">
                  Se notar qualquer atividade suspeita, encerre as conexões ativas em outros navegadores ou aparelhos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-1 py-2 text-[#e53935] font-medium text-[13.5px] transition active:scale-95 cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Outras Sessões</span>
              </button>
            </section>

            <section className="border-b border-[#e6e8eb] dark:border-white/10">
              <div className="py-4 border-b border-[#e6e8eb] dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2481cc]" />
                  <h3 className="text-[14px] font-medium text-black dark:text-white">
                    Histórico de Acessos & Conexões
                  </h3>
                </div>
                <span className="text-[12px] font-semibold text-[#707579] dark:text-[#8e9aa5]">
                  {sessions.length} {sessions.length === 1 ? 'registo' : 'registos'}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-[#29b85e] mx-auto opacity-75" />
                  <p className="text-[14px] font-medium text-black dark:text-white">
                    Nenhuma outra sessão registada
                  </p>
                  <p className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] max-w-sm mx-auto">
                    A sua conta está conectada e operando com segurança exclusivamente neste dispositivo.
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
                                  Atual
                                </span>
                              )}
                            </div>

                            <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5] truncate mt-0.5">
                              {sess.action_type === 'session_active'
                                ? 'Sessão Ativa'
                                : sess.action_type === 'registration_check_success'
                                ? 'Verificação de Registo'
                                : sess.action_type === 'session_terminated'
                                ? 'Sessão Encerrada'
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
                              ? 'Encerrada'
                              : sess.success
                              ? 'Verificado'
                              : 'Alerta'}
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
                Terminar Outras Sessões?
              </h3>
            </div>

            <p className="text-[13.5px] text-[#707579] dark:text-[#8e9aa5] leading-relaxed">
              Todos os outros dispositivos ou navegadores conectados à sua conta serão desconectados imediatamente. Apenas esta sessão atual permanecerá ativa.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={terminating}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-[13.5px] font-semibold text-[#707579] dark:text-[#8e9aa5] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Cancelar
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
                    <span>A encerrar...</span>
                  </>
                ) : (
                  <span>Confirmar e Encerrar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
