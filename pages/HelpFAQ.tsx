import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronLeft, ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export default function HelpFAQ() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData: FAQItem[] = [
    {
      question: t('faq.q1'),
      answer: (
        <div className="space-y-3 text-[#555555] font-normal text-[13px] leading-relaxed">
          <p>{t('faq.a1_p1')}</p>
          <div className="bg-[#FAFAFA] p-3 border-l-2 border-[#FE384F] text-[12px] text-[#333333]">
            {t('faq.a1_note')}
          </div>
          <ol className="list-decimal ml-5 space-y-1.5">
            <li>{t('faq.a1_li1')}</li>
            <li>{t('faq.a1_li2')}</li>
            <li>{t('faq.a1_li3')}</li>
            <li>{t('faq.a1_li4')}</li>
            <li>{t('faq.a1_li5')}</li>
            <li>{t('faq.a1_li6')}</li>
          </ol>
          <div className="pt-1">
            <Link to="/sand-pay" className="inline-flex items-center text-[#FE384F] font-normal hover:underline text-[12.5px]">
              {t('faq.a1_link')}
            </Link>
          </div>
        </div>
      )
    },
    {
      question: t('faq.q2'),
      answer: (
        <div className="space-y-3 text-[#555555] font-normal text-[13px] leading-relaxed">
          <p>{t('faq.a2_p1')}</p>
          <ul className="list-disc ml-5 space-y-1.5">
            <li>{t('faq.a2_li1')}</li>
            <li>{t('faq.a2_li2')}</li>
            <li>{t('faq.a2_li3')}</li>
            <li>{t('faq.a2_li4')}</li>
            <li>{t('faq.a2_li5')}</li>
          </ul>
          <div className="pt-1">
            <Link to="/carteira" className="inline-flex items-center text-[#FE384F] font-normal hover:underline text-[12.5px]">
              {t('faq.a2_link')}
            </Link>
          </div>
        </div>
      )
    },
    {
      question: t('faq.q3'),
      answer: (
        <div className="space-y-3 text-[#555555] font-normal text-[13px] leading-relaxed">
          <p>{t('faq.a3_p1')}</p>
          <ol className="list-decimal ml-5 space-y-1.5">
            <li>{t('faq.a3_li1')}</li>
            <li>{t('faq.a3_li2')}</li>
            <li>{t('faq.a3_li3')}</li>
            <li>{t('faq.a3_li4')}</li>
          </ol>
          <Link to="/operacoes" className="inline-flex items-center text-[#FE384F] font-normal hover:underline text-[12.5px]">
            {t('faq.a3_link')}
          </Link>
        </div>
      )
    },
    {
      question: t('faq.q4'),
      answer: (
        <div className="space-y-3 text-[#555555] font-normal text-[13px] leading-relaxed">
          <p>{t('faq.a4_p1')}</p>
          <p>{t('faq.a4_p2')}</p>
          <div className="bg-[#FAFAFA] p-3 border-l-2 border-[#FE384F] text-[12px] text-[#333333]">
            {t('faq.a4_note')}
          </div>
          <Link to="/botfather" className="inline-flex items-center text-[#FE384F] font-normal hover:underline text-[12.5px]">
            {t('faq.a4_link')}
          </Link>
        </div>
      )
    },
    {
      question: t('faq.q5'),
      answer: (
        <div className="space-y-3 text-[#555555] font-normal text-[13px] leading-relaxed">
          <p>{t('faq.a5_p1')}</p>
          <p>{t('faq.a5_p2')}</p>
          <Link to="/sobre-business" className="inline-flex items-center text-[#FE384F] font-normal hover:underline text-[12.5px]">
            {t('faq.a5_link')}
          </Link>
        </div>
      )
    },
    {
      question: t('faq.q6'),
      answer: (
        <p className="text-[13px] font-normal leading-relaxed text-[#555555]">{t('faq.a6')}</p>
      )
    },
    {
      question: t('faq.q7'),
      answer: (
        <p className="text-[13px] font-normal leading-relaxed text-[#555555]">{t('faq.a7')}</p>
      )
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#F2F2F2] pb-20 font-sans antialiased text-[#202020] select-none flex flex-col items-center">
      <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/suporte')} 
            className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
            {t('faq.help_center')}
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-4 pt-4 space-y-2.5">
        <div className="space-y-2">
          {faqData.map((item, idx) => (
            <div key={idx} className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
              <button 
                onClick={() => toggleFAQ(idx)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer"
              >
                <span className={cn(
                  "text-[13.5px] font-normal transition-colors pr-3",
                  openIndex === idx ? "text-[#FE384F]" : "text-[#202020]"
                )}>
                  {item.question}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200 shrink-0",
                  openIndex === idx ? "rotate-180 text-[#FE384F]" : "text-[#AAAAAA]"
                )} />
              </button>
              
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white rounded-none text-center space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gray-100">
          <p className="text-[13px] font-normal text-[#555555]">{t('faq.feedback_useful')}</p>
          <div className="flex justify-center gap-2">
            <button 
              onClick={() => showToast(t('faq.feedback_thanks'), 'success')}
              className="h-[36px] px-5 bg-[#F5F5F5] rounded-none text-[12.5px] font-normal text-[#202020] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            >
              {t('faq.yes')}
            </button>
            <button 
              onClick={() => navigate('/suporte')}
              className="h-[36px] px-5 bg-[#F5F5F5] rounded-none text-[12.5px] font-normal text-[#202020] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            >
              {t('faq.no')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
