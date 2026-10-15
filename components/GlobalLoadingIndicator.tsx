import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalLoading } from '../contexts/LoadingContext';
import { useLanguage } from '../contexts/LanguageContext';

export const GlobalLoadingIndicator: React.FC = () => {
  const { isLoading } = useGlobalLoading();
  const { t } = useLanguage();
  const location = useLocation();

  // Don't show the top global loader on chat and community pages
  const isChatPage = 
    location.pathname.startsWith('/chat') ||
    [
      '/org',
      '/telegramBussiness',
      '/telegramBusiness',
      '/telegram-business',
      '/web',
      '/canais',
      '/canal-oficial',
      '/pavelDurov',
      '/pavel-durov'
    ].includes(location.pathname);

  if (isChatPage) {
    return null;
  }

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -44, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 left-0 right-0 h-[44px] z-[10000] bg-white/95 backdrop-blur-xs border-b border-gray-100 flex items-center justify-start px-[18px] select-none overflow-hidden shadow-xs pointer-events-none"
        >
          <div className="flex items-center gap-2.5">
            {/* Business Messenger logo with a spinning ring */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              {/* Outer spinning green ring */}
              <div className="absolute -inset-[2px] rounded-full border-[2.2px] border-[#25ae60] border-t-transparent animate-spin" />
              <img src="/logo_bussiness_messeger.jpg" alt="" aria-hidden="true" className="h-7 w-7 rounded-full object-cover shadow-xs" />
            </div>

            {/* Text "Conectando..." in green */}
            <span className="text-[14px] font-bold text-[#25ae60] tracking-[-0.2px]">
              {t('common.connecting')}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
