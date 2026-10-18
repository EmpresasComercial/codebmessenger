import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, MessageCircle, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function InviteShareIllustration({
  inviteCode,
  copiedCode,
  onCopyCode,
}: {
  inviteCode: string;
  copiedCode: boolean;
  onCopyCode: () => void;
}) {
  const { t } = useLanguage();
  const hasInviteCode = inviteCode !== '' && inviteCode !== '---';
  const illustrationRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const illustration = illustrationRef.current;
    if (!illustration) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '100px 0px' },
    );
    observer.observe(illustration);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={illustrationRef}
      className={`invite-share-illustration relative mx-auto w-full max-w-[412px] overflow-hidden ${hasInviteCode ? 'h-[244px]' : 'h-[156px]'}${isVisible ? ' is-visible' : ''}`}
    >
      <div className={`absolute inset-x-0 top-0 ${hasInviteCode ? 'h-[320px]' : 'h-[210px]'}`}>
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
            <div aria-hidden="true" className="invite-share-screen relative h-[120px] overflow-hidden bg-slate-50 px-2.5">
              <div className="invite-share-stage invite-share-stage-copy absolute inset-0 px-2.5 pt-3">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <Link2 className="h-4 w-4" />
                </div>
                <div className="mt-2 text-center text-[7px] font-semibold text-slate-700">{t('invite.demo_title')}</div>
                <div className="mt-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[6px] text-slate-500">telegramas.cc/t/•••</span>
                  <Copy className="h-2.5 w-2.5 shrink-0 text-sky-600" />
                </div>
                <div className="invite-demo-copied mt-1 flex items-center justify-center gap-1 text-[6px] font-medium text-emerald-600">
                  <Check className="h-2.5 w-2.5" />
                  {t('invite.demo_copied')}
                </div>
                <div className="mt-2 flex justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25d366] text-white">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1877f2] text-[10px] font-bold text-white">f</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#229ed9] text-white">
                    <Send className="h-3 w-3" />
                  </span>
                </div>
              </div>
              <div className="invite-share-stage invite-share-stage-message absolute inset-0 bg-[#f4f7f9] px-2.5 pt-3">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25d366] text-white">
                    <MessageCircle className="h-3 w-3" />
                  </span>
                  <span className="h-1.5 w-10 rounded-full bg-slate-300" />
                </div>
                <div className="invite-demo-link mt-3 ml-auto max-w-[92%] rounded-lg rounded-br-sm bg-[#d9fdd3] px-2 py-1.5 text-[6px] leading-[10px] text-slate-600">
                  https://telegramas.cc/t/•••
                </div>
                <div className="mt-2 h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="invite-demo-composer absolute bottom-3 left-2 right-2 flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white px-2">
                  <span className="invite-demo-composer-text h-1.5 w-12 rounded-full bg-sky-200" />
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#25d366] text-white">
                    <Send className="h-2 w-2" />
                  </span>
                </div>
              </div>
            </div>
            {hasInviteCode && (
              <>
                <p className="flex h-7 items-center justify-center bg-slate-50 px-2 text-center text-[10px] leading-[13px] text-slate-500">
                  {t('invite.code_copy_instruction')}
                </p>
                <button
                  type="button"
                  onClick={onCopyCode}
                  aria-label={`${t('common.copy')} ${t('invite.code_label').toLocaleLowerCase()}`}
                  className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 px-4 text-left font-mono text-[14px] text-[#222222] transition-colors"
                  style={{ backgroundColor: '#f8fafc' }}
                >
                  <span className="truncate">{inviteCode}</span>
                  {copiedCode
                    ? <Check className="h-4 w-4 shrink-0 text-[#29b85e]" />
                    : <Copy className="h-4 w-4 shrink-0 text-[#2481cc]" />
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
