import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import AboutIllustration from '../components/AboutIllustration';

const aboutSections = [
  'about.identity',
  'about.history',
  'about.messaging',
  'about.passkey',
  'about.zoom',
  'about.menu',
  'about.notifications',
  'about.sessions',
  'about.recharge',
  'about.withdrawal',
  'about.xfather',
  'about.security',
  'about.additional',
] as const;

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [isLogoUnderHeader, setIsLogoUnderHeader] = useState(false);

  useEffect(() => {
    const updateLogoVisibility = () => {
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom;
      const logoBottom = logoRef.current?.getBoundingClientRect().bottom;
      if (headerBottom === undefined || logoBottom === undefined) return;
      setIsLogoUnderHeader(logoBottom <= headerBottom);
    };

    updateLogoVisibility();
    window.addEventListener('scroll', updateLogoVisibility, { passive: true });
    window.addEventListener('resize', updateLogoVisibility);
    return () => {
      window.removeEventListener('scroll', updateLogoVisibility);
      window.removeEventListener('resize', updateLogoVisibility);
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white font-sans text-[#202833] dark:bg-[#0e1621] dark:text-[#f2f4f7]">
      <header ref={headerRef} className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#17212b]/95">
        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc] dark:text-gray-200 dark:hover:bg-white/10"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight">{t('about.page_heading')}</h1>
        </div>
        <img
          src="/logo_tegx.jfif"
          alt=""
          aria-hidden="true"
          className={`h-8 w-8 rounded-full object-cover transition-all duration-200 ${isLogoUnderHeader ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        />
      </header>

      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <article>
          {aboutSections.map((section) => (
            <section
              key={section}
              aria-labelledby={`${section}-title`}
              className="mb-6 last:mb-0"
            >
              <h3 id={`${section}-title`} className="text-[17px] font-semibold leading-snug text-[#182431] dark:text-white">
                {t(`${section}.title`)}
              </h3>
              <AboutIllustration
                section={section}
                logoRef={section === 'about.identity' ? logoRef : undefined}
              />
              <p className="mt-2 whitespace-pre-line text-[14px] leading-7 text-[#4f5b67] dark:text-[#c1cbd5]">
                {t(`${section}.body`)}
              </p>
            </section>
          ))}
        </article>
      </main>
      <footer className="mx-auto mt-auto w-full max-w-[820px] px-5 py-6 text-center text-[12px] leading-5 text-[#687482] dark:text-[#aab4bf] sm:px-8">
        {t('about.footer')}
      </footer>
    </div>
  );
}
