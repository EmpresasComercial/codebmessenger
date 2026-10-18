import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronLeft, Loader2, MessageCircle, Send } from 'lucide-react';
import { getAtendimentoLinks } from '../lib/atendimento';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

export default function HelpFAQ() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [contactEmail, setContactEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const keepTextareaVisibleFrame = useRef<number | null>(null);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const keepTextareaVisible = () => {
    if (keepTextareaVisibleFrame.current !== null) {
      cancelAnimationFrame(keepTextareaVisibleFrame.current);
    }

    keepTextareaVisibleFrame.current = requestAnimationFrame(() => {
      keepTextareaVisibleFrame.current = null;
      const textarea = messageTextareaRef.current;
      if (textarea && document.activeElement === textarea) {
        textarea.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    const textarea = messageTextareaRef.current;
    if (!textarea) return;

    const maxHeight = 150;
    textarea.style.height = 'auto';
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
    textarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
  }, [contactMessage]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    viewport.addEventListener('resize', keepTextareaVisible);
    return () => {
      viewport.removeEventListener('resize', keepTextareaVisible);
      if (keepTextareaVisibleFrame.current !== null) {
        cancelAnimationFrame(keepTextareaVisibleFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void getAtendimentoLinks().then((links) => {
      const target = links?.whatsapp_grupo_vendas || links?.whatsapp_gerente || links?.whatsapp;
      if (!target) return;

      try {
        const url = new URL(target);
        if (isCurrent && (url.protocol === 'https:' || url.protocol === 'http:')) {
          setWhatsappUrl(url.toString());
        }
      } catch {
        // Ignore a malformed WhatsApp URL and keep the email form available.
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSendEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = contactEmail.trim();
    if (!isValidEmail(email)) {
      setEmailError(t('faq.email_invalid'));
      return;
    }

    setEmailError('');
    setIsSendingEmail(true);

    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: {
          email,
          message: contactMessage.trim(),
        },
      });

      if (error) throw error;

      showToast(t('faq.email_sent'), 'success');
      setContactEmail('');
      setContactMessage('');
    } catch (error) {
      logger.error('HelpFAQ', 'Could not send the support email.', error);
      showToast(t('faq.email_failed'), 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white pb-20 font-sans antialiased text-[#202020] select-none flex flex-col items-center dark:bg-[#0e1621] dark:text-white">
      <header className="w-full max-w-[980px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 border-b border-gray-100 dark:bg-[#0e1621] dark:border-white/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/suporte')} 
            className="p-1 -ml-1 text-[#202020] transition-transform active:scale-95 dark:text-white"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          <h1 className="text-[14.5px] font-medium tracking-normal text-[#202020] dark:text-white">
            {t('faq.help_center')}
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[980px] px-4 pt-4">
        <div className="grid items-start gap-8 py-4 md:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col items-center text-center">
            <div className="relative mx-auto h-[244px] w-full max-w-[412px] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[320px]">
                <span className="absolute -left-[1px] top-[48px] h-7 w-[2px] rounded-l-sm bg-slate-400/80" />
                <span className="absolute -right-[1px] top-[68px] h-10 w-[2px] rounded-r-sm bg-slate-400/80" />
                <div className="relative h-full rounded-[30px] border border-slate-400/90 bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 p-[3px] shadow-[0_5px_14px_rgba(15,23,42,.16)]">
                  <div className="h-full overflow-hidden rounded-[26px] border border-slate-800/80 bg-white">
                    <div aria-hidden="true" className="relative flex h-[20px] items-center justify-between bg-white px-3 text-[7px] font-semibold text-slate-900">
                      <span>9:41</span>
                      <span className="absolute left-1/2 top-[3px] h-[13px] w-[42px] -translate-x-1/2 rounded-full bg-[#07090b]" />
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-2 rounded-[2px] border border-slate-800" />
                        <span className="h-1.5 w-2 rounded-[2px] bg-slate-800" />
                      </span>
                    </div>
                    <div aria-hidden="true" className="flex h-6 items-center gap-1.5 border-b border-slate-100 bg-white px-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[7px] font-bold text-white">T</span>
                      <span className="h-1.5 w-11 rounded-full bg-slate-300" />
                      <span className="ml-auto h-1 w-3 rounded-full bg-slate-200" />
                    </div>
                    <div className="relative flex h-[188px] flex-col items-center justify-center gap-1.5 bg-slate-50 px-3 text-center">
                      <img
                        src="/avatar_padrao_bm.jpg"
                        alt=""
                        className="h-10 w-10 rounded-full border border-slate-300 bg-white object-cover"
                      />
                      <span className="text-[10px] font-semibold text-slate-700">Teggram-X</span>
                      <span className="text-[8px] font-medium text-emerald-600">{t('faq.support_online')}</span>
                      <span className="max-w-[90%] rounded-lg rounded-tl-sm bg-white px-2 py-1 text-[8px] text-slate-600 shadow-sm">
                        {t('faq.support_greeting')}
                      </span>
                    </div>
                    <div aria-hidden="true" className="flex h-3 items-center justify-center bg-white">
                      <span className="h-[3px] w-9 rounded-full bg-[#15191d]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <a
              href={whatsappUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!whatsappUrl}
              onClick={(event) => {
                if (!whatsappUrl) {
                  event.preventDefault();
                  showToast(t('faq.whatsapp_unavailable'), 'info');
                }
              }}
              className={`mt-4 inline-flex min-h-11 w-full max-w-[412px] items-center justify-center gap-2 px-5 text-sm font-semibold text-white transition ${
                whatsappUrl ? 'bg-[#25d366] hover:bg-[#20bd5a]' : 'bg-[#25d366]/60'
              }`}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              {t('faq.whatsapp_button')}
            </a>
          </div>

          <form onSubmit={handleSendEmail} className="flex flex-col gap-3 md:pt-8">
            <div>
              <label htmlFor="support-email" className="mb-1.5 block text-sm font-medium text-[#202020] dark:text-white">
                {t('faq.email_label')}
              </label>
              <input
                id="support-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                value={contactEmail}
                onChange={(event) => {
                  const value = event.target.value;
                  setContactEmail(value);
                  if (!value.trim() || isValidEmail(value)) setEmailError('');
                }}
                onBlur={() => {
                  if (contactEmail.trim() && !isValidEmail(contactEmail)) {
                    setEmailError(t('faq.email_invalid'));
                  }
                }}
                onInvalid={(event) => {
                  if (event.currentTarget.value.trim()) {
                    setEmailError(t('faq.email_invalid'));
                  }
                }}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'support-email-error' : undefined}
                placeholder={t('faq.email_placeholder')}
                className="help-faq-field w-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-[#202020] outline-none transition focus:border-[#2481cc] focus:ring-2 focus:ring-[#2481cc]/15 dark:border-white/10 dark:bg-[#101921] dark:text-white"
              />
              {emailError && (
                <p id="support-email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex-1">
              <label htmlFor="support-message" className="mb-1.5 block text-sm font-medium text-[#202020] dark:text-white">
                {t('faq.message_label')}
              </label>
              <textarea
                ref={messageTextareaRef}
                id="support-message"
                required
                maxLength={5000}
                rows={1}
                value={contactMessage}
                onChange={(event) => {
                  setContactMessage(event.target.value);
                  const textarea = event.currentTarget;
                  textarea.style.height = 'auto';
                  const contentHeight = textarea.scrollHeight;
                  textarea.style.height = `${Math.min(contentHeight, 150)}px`;
                  textarea.style.overflowY = contentHeight > 150 ? 'auto' : 'hidden';
                  keepTextareaVisible();
                }}
                onFocus={keepTextareaVisible}
                placeholder={t('faq.message_placeholder')}
                className="help-faq-field w-full min-h-11 max-h-[150px] resize-none overflow-y-hidden border border-gray-200 bg-white px-5 py-2.5 text-sm text-[#202020] outline-none transition focus:border-[#2481cc] focus:ring-2 focus:ring-[#2481cc]/15 dark:border-white/10 dark:bg-[#101921] dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingEmail}
              className="help-faq-submit inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2481cc] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f72b5] disabled:cursor-wait disabled:opacity-60"
            >
              {isSendingEmail
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Send className="h-4 w-4" aria-hidden="true" />}
              {isSendingEmail ? t('faq.email_sending') : t('faq.send_email')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
