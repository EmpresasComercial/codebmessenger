import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const MAIN_TAB_PATHS = new Set([
  '/conversas',
  '/org',
  '/telegramBussiness',
  '/telegramBusiness',
  '/telegram-business',
  '/perfil',
  '/definicoes',
  '/settings',
  '/configuracoes-conta',
]);

export default function Layout() {
  const location = useLocation();

  const isChatRoom = location.pathname.startsWith('/chat/') ||
                     location.pathname.toLowerCase() === '/grupo';

  const showNavbar = !isChatRoom && MAIN_TAB_PATHS.has(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#17212b] font-sans text-[#111827] dark:text-[#f3f4f6] antialiased">
      {/* Full-width application shell */}
      <div className="w-full min-h-[100dvh] bg-white dark:bg-[#17212b] flex flex-col relative">
        <main className={showNavbar ? 'pb-[60px] md:pb-0 flex-1 flex flex-col w-full' : 'flex-1 flex flex-col w-full'}>
          <Outlet context={{ 
            openAutoMessages: () => {}
          }} />
        </main>

        {showNavbar && <div className="md:hidden"><Navbar /></div>}
      </div>
    </div>
  );
}
