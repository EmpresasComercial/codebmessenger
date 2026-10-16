import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const contactEmail = 'contacta@telegramas.cc';

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-white font-sans text-[#222] dark:bg-[#0e1621] dark:text-[#f5f5f5]">
      <header className="sticky top-0 z-30 flex h-14 w-full items-center border-b border-[#e6e8eb] bg-white px-4 dark:border-white/10 dark:bg-[#0e1621]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mr-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#707579] transition hover:bg-black/5 dark:text-[#8e9aa5] dark:hover:bg-white/10"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
        </button>
        <h1 className="text-[17px] font-medium tracking-tight text-black dark:text-white">
          {t('devices.title')}
        </h1>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-5 sm:px-6">
        <div className="space-y-5 text-[14px] leading-relaxed text-[#444] dark:text-[#cfd8dc]">
          {sectionKeys.map(([titleKey, textKey]) => (
            <section key={titleKey} className="space-y-1">
              <h2 className="text-[14.5px] font-medium text-black dark:text-white">
                {t(titleKey)}
              </h2>
              <p className="text-[13px] text-[#666] dark:text-[#a0acb9]">
                {textKey === 'devices.section9_text' ? (() => {
                  const contactText = t(textKey);
                  const emailIndex = contactText.indexOf(contactEmail);

                  if (emailIndex < 0) return contactText;

                  return (
                    <>
                      {contactText.slice(0, emailIndex)}
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-blue-600 underline dark:text-blue-400"
                      >
                        {contactEmail}
                      </a>
                      {contactText.slice(emailIndex + contactEmail.length)}
                    </>
                  );
                })() : t(textKey)}
              </p>
            </section>
          ))}
          <p className="pt-4 text-center text-[12px] text-gray-400 dark:text-gray-500">
            {t('devices.footer')}
          </p>
        </div>
      </main>
    </div>
  );
}
