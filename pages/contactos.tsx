import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import InviteShareIllustration from '../components/InviteShareIllustration';
import InviteCommissionIllustration from '../components/InviteCommissionIllustration';
import { 
  ChevronLeft, Copy, Share2, Check, 
  QrCode, X
} from 'lucide-react';

export default function ContactsInvite() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [inviteCode, setInviteCode] = useState<string>('---');
  const defaultDomain = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://www.telegramas.cc';
  const [baseUrl, setBaseUrl] = useState<string>(defaultDomain);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const rawInviteLink = inviteCode && inviteCode !== '---' 
    ? `${baseUrl}/t?${inviteCode}` 
    : `${baseUrl}/t`;

  useEffect(() => {
    if (rawInviteLink) {
      QRCode.toDataURL(rawInviteLink, { width: 220, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [rawInviteLink]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: inviteData, error: inviteErr } = await supabase.rpc('get_invite_page_data_mcpn');
        
        const invPayload = inviteData as any;
        if (!inviteErr && invPayload?.success) {
          if (invPayload.invite_code) {
            setInviteCode(invPayload.invite_code);
          }
          if (invPayload.app_link) {
            setBaseUrl(invPayload.app_link);
          }
          return;
        }

        // Fallback resiliente usando RPCs oficiais sem acesso direto a tabelas
        const { data: settingsData } = await supabase.rpc('get_my_settings_data_mcpn');
        if (settingsData && settingsData.length > 0 && settingsData[0].invite_code) {
          setInviteCode(settingsData[0].invite_code);
        } else {
          const { data: accData } = await supabase.rpc('get_my_account_data');
          if (accData && accData.length > 0 && (accData[0] as any)?.codigo_meu_refferal) {
            setInviteCode((accData[0] as any).codigo_meu_refferal);
          }
        }

        if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
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
      showToast(t('invite.copy_toast'), 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      showToast(t('invite.copy_toast'), 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }, [showToast, t]);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Teggram-X', url: rawInviteLink }); } catch {}
    } else {
      copyToClipboard(rawInviteLink, false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state?.idx > 0) navigate(-1);
    else navigate('/org');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#f1f1f2] dark:bg-[#0e1621] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#2481cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white font-sans text-[#222222] antialiased pb-28 select-none">

      {/* Simple header matching the About page layout */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight text-[#222222]">Programa de convide</h1>
      </header>

      <main className="mx-auto w-full max-w-[860px] space-y-8 px-4 pt-8">
        <div className="mx-auto w-full max-w-[420px] px-1">
          <InviteShareIllustration
            inviteCode={inviteCode}
            copiedCode={copiedCode}
            onCopyCode={() => copyToClipboard(inviteCode, true)}
          />
        </div>

        <section className="mx-auto w-full max-w-[420px] space-y-5 px-1 text-center">
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(rawInviteLink, false)}
              className="invite-link-copy-button flex h-12 w-full cursor-pointer items-center justify-center gap-2 bg-[#0878ff] text-[14px] font-medium text-white transition-colors hover:bg-[#006be6]"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? t('common.copied') : `${t('common.copy')} ${t('invite.link_label').toLocaleLowerCase()}`}</span>
            </button>
          </div>
        </section>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-gray-200 px-4 text-[14px] text-[#2481cc] transition-colors hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4" />
            {t('common.share')}
          </button>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-gray-200 px-4 text-[14px] text-[#2481cc] transition-colors hover:bg-gray-50"
          >
            <QrCode className="h-4 w-4" />
            {t('invite.qr_code')}
          </button>
        </div>

        <section className="space-y-6 border-t border-gray-200 pt-8 text-[14px] leading-6 text-[#333333]">
          <section id="programa-afiliados" className="space-y-3">
            <p>
              {t('invite.program_description')}
            </p>
          </section>

          <section id="compartilhando-link-afiliado" className="space-y-3">
            <h2 className="text-[19px] font-medium leading-tight text-[#222222]">
              {t('invite.title')}
            </h2>
            <p>
              {t('invite.share_howto')}
            </p>
          </section>

          <section id="comissoes" className="space-y-3">
            <h2 className="text-[19px] font-medium leading-tight text-[#222222]">
              {t('profile.team_commissions')}
            </h2>
            <InviteCommissionIllustration />
          </section>

          <section id="perguntas-frequentes" className="space-y-4">
            <h2 className="text-[19px] font-medium leading-tight text-[#222222]">
              {t('invite.faq_heading')}
            </h2>
            <details className="border-b border-gray-200 pb-4">
              <summary className="cursor-pointer font-medium text-[#222222]">{t('invite.faq_commissions_question')}</summary>
              <p className="pt-3">
                {t('invite.faq_commissions_answer')}
              </p>
            </details>
            <details className="border-b border-gray-200 pb-4">
              <summary className="cursor-pointer font-medium text-[#222222]">{t('invite.faq_ten_question')}</summary>
              <p className="pt-3">
                {t('invite.faq_ten_answer')}
              </p>
            </details>
            <details className="border-b border-gray-200 pb-4">
              <summary className="cursor-pointer font-medium text-[#222222]">{t('invite.faq_multiple_question')}</summary>
              <p className="pt-3">
                {t('invite.faq_multiple_answer')}
              </p>
            </details>
          </section>

        </section>
      </main>

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
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#e4e4e4] dark:border-[#1e2c3a]">
              <span className="text-[16px] font-semibold text-black dark:text-white">{t('invite.qr_code')}</span>
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
              <div className="bg-white p-3 rounded-[12px] flex items-center justify-center min-w-[200px] min-h-[200px]">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={t('invite.qr_alt')}
                    className="w-[200px] h-[200px]"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#2481cc] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] text-center mt-3 max-w-[280px] leading-relaxed">
                {t('invite.qr_instructions')}
              </p>
            </div>

            {/* Modal actions */}
            <div className="border-t border-[#e4e4e4] dark:border-[#1e2c3a] divide-y divide-[#e4e4e4] dark:divide-[#1e2c3a]">
              <button
                type="button"
                onClick={() => copyToClipboard(rawInviteLink, false)}
                className="w-full h-[50px] flex items-center justify-center gap-2 text-[15px] text-[#2481cc] dark:text-[#5288c1] font-medium cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition"
              >
                <Copy className="w-4 h-4" />
                {t('invite.copy_link')}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full h-[50px] flex items-center justify-center text-[15px] text-[#707579] dark:text-[#8e9aa5] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#1e2c3a] transition"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
