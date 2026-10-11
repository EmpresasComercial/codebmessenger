import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Copy, Share2, Check, 
  QrCode, X, ExternalLink, Link2
} from 'lucide-react';

export default function ContactsInvite() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [inviteCode, setInviteCode] = useState<string>('---');
  const defaultDomain = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://www.telegramas.cc';
  const [baseUrl, setBaseUrl] = useState<string>(defaultDomain);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const rawInviteLink = inviteCode && inviteCode !== '---' 
    ? `${baseUrl}/t?${inviteCode}` 
    : `${baseUrl}/t`;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [settingsRes, linksRes, accountRes, authUserRes] = await Promise.all([
          supabase.rpc('get_my_settings_data_mcpn'),
          supabase.from('atendimento_links').select('links').maybeSingle(),
          supabase.rpc('get_my_account_data'),
          supabase.auth.getUser()
        ]);

        let code = '';
        if (settingsRes.data && settingsRes.data.length > 0 && settingsRes.data[0].invite_code) {
          code = settingsRes.data[0].invite_code;
        }
        if (!code && accountRes.data && accountRes.data.length > 0) {
          code = (accountRes.data[0] as any)?.codigo_meu_refferal || '';
        }
        if (!code && authUserRes.data?.user?.id) {
          const { data: userRow } = await supabase
            .from('sys_t500')
            .select('codigo_meu_refferal')
            .eq('id', authUserRes.data.user.id)
            .maybeSingle();
          if (userRow?.codigo_meu_refferal) code = userRow.codigo_meu_refferal;
        }
        if (code) setInviteCode(code);

        const linksObj = linksRes.data?.links as Record<string, any> | null;
        const appLink = linksObj?.app_atualizado || linksObj?.link_app_atualizado;
        if (appLink) {
          let raw = String(appLink).trim().replace(/\/$/, '');
          if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
          // Se estiver configurado com o domínio antigo join-t.me, substitui pelo domínio oficial telegramas.cc
          if (raw.includes('join-t.me')) {
            raw = 'https://www.telegramas.cc';
          }
          if (raw) setBaseUrl(raw);
        } else if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
          setBaseUrl(window.location.origin);
        } else {
          setBaseUrl('https://www.telegramas.cc');
        }
      } catch {}
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const copyToClipboard = useCallback((text: string, isCode = false) => {
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      showToast('Código de convite copiado!', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      showToast('Link copiado!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }, [showToast]);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Telegram', url: rawInviteLink }); } catch {}
    } else {
      copyToClipboard(rawInviteLink, false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state?.idx > 0) navigate(-1);
    else navigate('/telegramBussiness');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#f1f1f2] dark:bg-[#0e1621] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#2481cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] dark:bg-[#0e1621] font-sans text-black dark:text-white select-none">

      {/* ── HEADER estilo grupochat ── */}
      <header className="w-full bg-transparent px-3 sm:px-4 py-3 sticky top-0 z-40 flex items-center justify-between select-none pointer-events-none">
        <button
          type="button"
          onClick={handleBack}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 max-w-[65%] pointer-events-auto">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <img src="/logo-tb.jpg" alt="Telegram" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-medium text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
              Link de Convite
            </h1>
            <span className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] font-normal leading-[1.15] mt-0.5 truncate">
              Telegram Business
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto cursor-pointer"
          aria-label="Partilhar"
        >
          <Share2 className="w-5 h-5 stroke-[2]" />
        </button>
      </header>

      <style>{`
        @keyframes duckBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        .duck-bounce { animation: duckBounce 2.6s ease-in-out infinite; }
      `}</style>

      {/* ── HERO CENTRAL ── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4 text-center">
        <div className="w-[100px] h-[100px] mb-4 flex items-center justify-center duck-bounce">
          <img
            src="/tg_duck_social.png"
            alt="Invite"
            className="w-full h-full object-contain select-none pointer-events-none"
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo-tb.jpg'; }}
          />
        </div>
        <h2 className="text-[20px] font-bold text-black dark:text-white">
          Link de Convite Oficial
        </h2>
        <p className="text-[14px] text-[#707579] dark:text-[#8e9aa5] mt-1 max-w-[340px] leading-[1.5]">
          Qualquer pessoa no Telegram pode usar este link para entrar na sua rede.
        </p>
      </div>

      {/* ── CAMPO DO LINK FLAT (SEM CARD, SEM SOMBRA) ── */}
      <div className="w-full bg-white dark:bg-[#17212b] border-t border-b border-[#e4e4e4] dark:border-[#1e2c3a]">
        <div className="w-full flex items-center px-4 h-[48px] border-b border-[#e4e4e4] dark:border-[#1e2c3a]">
          <Link2 className="w-4 h-4 text-[#2481cc] dark:text-[#5288c1] mr-3 shrink-0" />
          <span className="flex-1 text-[14px] text-black dark:text-white truncate font-mono select-all">
            {rawInviteLink}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(rawInviteLink, false)}
            className="text-[#2481cc] dark:text-[#5288c1] p-1 shrink-0 cursor-pointer active:opacity-60 transition-opacity"
          >
            {copiedLink
              ? <Check className="w-4 h-4 text-[#29b85e]" />
              : <Copy className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Botão Copiar */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => copyToClipboard(rawInviteLink, false)}
            className="w-full h-[40px] rounded-[10px] bg-[#2481cc] hover:bg-[#1d6fa5] text-white font-medium text-[14px] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
        </div>
      </div>

      {/* ── ESPAÇO ── */}
      <div className="h-4" />

      {/* ── LISTA DE AÇÕES FLAT TELEGRAM WEB ── */}
      <div className="w-full bg-white dark:bg-[#17212b] border-t border-b border-[#e4e4e4] dark:border-[#1e2c3a] divide-y divide-[#e4e4e4] dark:divide-[#1e2c3a]">

        {/* Copiar Ligação */}
        <button
          type="button"
          onClick={() => copyToClipboard(rawInviteLink, false)}
          className="w-full flex items-center h-[50px] px-4 hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition cursor-pointer text-left"
        >
          <Copy className="w-[20px] h-[20px] text-[#2481cc] dark:text-[#5288c1] mr-4 shrink-0" />
          <span className="flex-1 text-[15px] text-black dark:text-white">Copiar Ligação</span>
          {copiedLink && <Check className="w-4 h-4 text-[#29b85e]" />}
        </button>

        {/* Partilhar Ligação */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full flex items-center h-[50px] px-4 hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition cursor-pointer text-left"
        >
          <Share2 className="w-[20px] h-[20px] text-[#29b85e] mr-4 shrink-0" />
          <span className="flex-1 text-[15px] text-black dark:text-white">Partilhar Ligação</span>
        </button>

        {/* Código QR */}
        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className="w-full flex items-center h-[50px] px-4 hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition cursor-pointer text-left"
        >
          <QrCode className="w-[20px] h-[20px] text-[#8b5cf6] mr-4 shrink-0" />
          <span className="flex-1 text-[15px] text-black dark:text-white">Obter Código QR</span>
        </button>

        {/* Código de Convite */}
        {inviteCode && inviteCode !== '---' && (
          <button
            type="button"
            onClick={() => copyToClipboard(inviteCode, true)}
            className="w-full flex items-center h-[50px] px-4 hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition cursor-pointer text-left"
          >
            <ExternalLink className="w-[20px] h-[20px] text-[#f59e0b] mr-4 shrink-0" />
            <div className="flex-1">
              <div className="text-[15px] text-black dark:text-white leading-tight">Código de Convite</div>
              <div className="text-[12px] text-[#707579] dark:text-[#8e9aa5]">{inviteCode}</div>
            </div>
            <span className="text-[14px] text-[#2481cc] dark:text-[#5288c1] font-medium">
              {copiedCode ? 'Copiado' : 'Copiar'}
            </span>
          </button>
        )}
      </div>

      {/* ── NOTA FLAT ── */}
      <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] px-4 py-3 leading-relaxed">
        Qualquer utilizador com esta ligação pode aceder ao bot. Pode partilhar este link no Telegram ou em qualquer outra rede social.
      </p>

      {/* ── MODAL QR (FLAT E SIMPLES) ── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white dark:bg-[#17212b] sm:rounded-[16px] rounded-t-[16px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do modal */}
            <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#e4e4e4] dark:border-[#1e2c3a]">
              <span className="text-[16px] font-semibold text-black dark:text-white">Código QR</span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f1f2] dark:bg-[#1e2c3a] flex items-center justify-center text-[#707579] cursor-pointer hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center py-6 px-4">
              <div className="bg-white p-3 rounded-[12px]">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(rawInviteLink)}`}
                  alt="QR Code"
                  className="w-[200px] h-[200px]"
                />
              </div>
              <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] text-center mt-3 max-w-[280px] leading-relaxed">
                Aponte a câmara do telemóvel para aceder ao link de convite.
              </p>
            </div>

            {/* Acções flat */}
            <div className="border-t border-[#e4e4e4] dark:border-[#1e2c3a] divide-y divide-[#e4e4e4] dark:divide-[#1e2c3a]">
              <button
                type="button"
                onClick={() => copyToClipboard(rawInviteLink, false)}
                className="w-full h-[50px] flex items-center justify-center gap-2 text-[15px] text-[#2481cc] dark:text-[#5288c1] font-medium cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition"
              >
                <Copy className="w-4 h-4" />
                Copiar Ligação
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full h-[50px] flex items-center justify-center text-[15px] text-[#707579] dark:text-[#8e9aa5] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
