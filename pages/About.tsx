import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white pb-12 font-sans text-[#222]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight">Business Messenger</h1>
      </header>

      <main className="mx-auto max-w-[760px] px-5 pt-10">
        <section className="text-center">
          <img
            src="/logo_bussiness_messeger.jpg"
            alt="Business Messenger"
            className="mx-auto mb-6 h-24 w-24 rounded-2xl object-cover"
          />
          <h2 className="mb-4 text-[26px] font-semibold leading-tight">
            {t('chat.about_telegram')}
          </h2>
          <p className="mx-auto max-w-[640px] text-[16px] leading-7 text-[#555]">
            {t('about.service_description')}
          </p>
          <p className="mx-auto mt-4 max-w-[640px] text-[14px] leading-6 text-[#666]">
            {t('about.service_disclaimer')}
          </p>
        </section>
      </main>
    </div>
  );
}
