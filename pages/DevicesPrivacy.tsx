import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const sectionKeys = [
  ['devices.section1_title', 'devices.section1_text'],
  ['devices.section2_title', 'devices.section2_text'],
  ['devices.section3_title', 'devices.section3_text'],
  ['devices.section4_title', 'devices.section4_text'],
  ['devices.section5_title', 'devices.section5_text'],
  ['devices.section6_title', 'devices.section6_text'],
  ['devices.section7_title', 'devices.section7_text'],
  ['devices.section8_title', 'devices.section8_text'],
  ['devices.section9_title', 'devices.section9_text'],
] as const;

export default function DevicesPrivacy() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#f1f1f2] font-sans">
      <header className="sticky top-0 z-10 flex w-full items-center bg-[#f1f1f2] px-4 pb-3 pr-14 pt-5 text-black">
        <button onClick={() => navigate(-1)} className="mr-4 active:opacity-50" aria-label={t('common.back')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="flex-1 text-[18px] font-semibold">{t('devices.title')}</span>
      </header>

      <main className="mx-0 flex-1 overflow-y-auto bg-white px-5 py-6 text-[15px] leading-relaxed text-[#222]">
        <h1 className="mb-4 text-[22px] font-bold text-[#111]">{t('devices.heading')}</h1>

        {sectionKeys.map(([titleKey, textKey]) => (
          <section key={titleKey} className="mb-6">
            <h2 className="mb-2 text-[16px] font-bold text-[#111]">{t(titleKey)}</h2>
            <p>{t(textKey)}</p>
          </section>
        ))}

        <p className="mt-8 pb-4 text-center text-[12px] text-gray-400">{t('devices.footer')}</p>
      </main>
    </div>
  );
}

