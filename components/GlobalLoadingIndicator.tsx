import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalLoading } from '../contexts/LoadingContext';

export const GlobalLoadingIndicator: React.FC = () => {
  const { isLoading } = useGlobalLoading();
  const location = useLocation();

  // Don't show the top global loader on chat and community pages
  const isChatPage = 
    location.pathname.startsWith('/chat') ||
    [
      '/org',
      '/telegramBussiness',
      '/telegramBusiness',
      '/telegram-business',
      '/webgrupo',
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
            {/* Telegram Logo with Spinning Ring */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              {/* Outer spinning green ring */}
              <div className="absolute -inset-[2px] rounded-full border-[2.2px] border-[#25ae60] border-t-transparent animate-spin" />
              {/* Inner Telegram Blue Circle Logo */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-xs">
                <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[14px] h-[14px]">
                  <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
                  <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
                  <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
                </svg>
              </div>
            </div>

            {/* Text "Conectando..." in green */}
            <span className="text-[14px] font-bold text-[#25ae60] tracking-[-0.2px]">
              Conectando...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
