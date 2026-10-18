import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const commissionLevels = [
  { key: 'invite.tree_level_two', rate: '6%', left: '24%', top: '90px' },
  { key: 'invite.tree_level_one', rate: '10%', left: '50%', top: '38px' },
  { key: 'invite.tree_level_three', rate: '2%', left: '76%', top: '90px' },
] as const;

export default function InviteCommissionIllustration() {
  const { t } = useLanguage();
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
      aria-label={t('invite.tree_description')}
      className={`invite-commission-illustration relative mx-auto h-[184px] w-full max-w-[412px] overflow-hidden${isVisible ? ' is-visible' : ''}`}
      role="img"
    >
      <div className="absolute inset-x-0 top-0 h-[210px]">
        <span className="absolute -left-[1px] top-[48px] h-7 w-[2px] rounded-l-sm bg-slate-400/80" />
        <span className="absolute -right-[1px] top-[68px] h-10 w-[2px] rounded-r-sm bg-slate-400/80" />
        <div className="relative h-full rounded-[30px] border border-slate-400/90 bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 p-[3px] shadow-[0_5px_14px_rgba(15,23,42,.16)]">
          <div className="h-full overflow-hidden rounded-[26px] border border-slate-800/80 bg-white">
            <div className="relative flex h-[20px] items-center justify-between bg-white px-3 text-[7px] font-semibold text-slate-900">
              <span>9:41</span>
              <span className="absolute left-1/2 top-[3px] h-[13px] w-[42px] -translate-x-1/2 rounded-full bg-[#07090b]" />
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded-[2px] border border-slate-800" />
                <span className="h-1.5 w-2 rounded-[2px] bg-slate-800" />
              </span>
            </div>
            <div className="flex h-6 items-center gap-1.5 border-b border-slate-100 bg-white px-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[7px] font-bold text-white">T</span>
              <span className="h-1.5 w-11 rounded-full bg-slate-300" />
              <span className="ml-auto h-1 w-3 rounded-full bg-slate-200" />
            </div>
            <div className="invite-share-screen relative h-[150px] overflow-hidden bg-slate-50">
              <svg
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[112px] w-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 112"
              >
                <defs>
                  <marker id="invite-tree-arrow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
                    <path d="M0 0 L5 2.5 L0 5 z" fill="#64748b" />
                  </marker>
                </defs>
                <path d="M50 23 V32" fill="none" markerEnd="url(#invite-tree-arrow)" stroke="#64748b" strokeWidth="1.2" />
                <path d="M50 72 V78 C42 78 34 80 28 84 L24 88" fill="none" markerEnd="url(#invite-tree-arrow)" stroke="#64748b" strokeWidth="1.2" />
                <path d="M50 78 C58 78 66 80 72 84 L76 88" fill="none" markerEnd="url(#invite-tree-arrow)" stroke="#64748b" strokeWidth="1.2" />
              </svg>
              <div className="absolute left-1/2 top-0 flex h-[22px] w-[min(48px,20%)] -translate-x-1/2 flex-col items-center justify-center gap-px rounded-full border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,.08)]">
                <img
                  src="/avatar_padrao_bm.jpg"
                  alt=""
                  className="h-3 w-3 shrink-0 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span className="text-[7px] font-semibold leading-none text-slate-700">EU</span>
              </div>
              {commissionLevels.map(({ key, rate, left, top }) => (
                <div
                  key={key}
                  className="absolute flex w-[min(72px,22%)] -translate-x-1/2 flex-col items-center gap-[2px]"
                  style={{ left, top }}
                >
                  <img
                    src="/avatar_padrao_bm.jpg"
                    alt=""
                    className="h-[22px] w-[22px] rounded-full border border-slate-300 bg-white object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="whitespace-nowrap text-[9px] font-semibold leading-none text-slate-700">
                    {key.endsWith('one') ? 'L1' : key.endsWith('two') ? 'L2' : 'L3'} · {rate}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex h-3 items-center justify-center bg-white">
              <span className="h-[3px] w-9 rounded-full bg-[#15191d]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
