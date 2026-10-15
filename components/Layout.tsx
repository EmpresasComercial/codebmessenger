import React, { useEffect, useState } from 'react';
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

const BOTTOM_NAV_MENU_KEY = 'show_bottom_nav_menu';

export default function Layout() {
  const location = useLocation();
  const [showBottomNavMenu, setShowBottomNavMenu] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(BOTTOM_NAV_MENU_KEY);
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    const syncPreference = () => {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage.getItem(BOTTOM_NAV_MENU_KEY);
      setShowBottomNavMenu(saved === null ? true : saved === 'true');
    };

    syncPreference();
    window.addEventListener('bottomNavMenuPreferenceChanged', syncPreference);
    return () => window.removeEventListener('bottomNavMenuPreferenceChanged', syncPreference);
  }, []);

  const isChatRoom = location.pathname.startsWith('/chat/') ||
                     location.pathname.toLowerCase() === '/grupo';

  const showNavbar = !isChatRoom && MAIN_TAB_PATHS.has(location.pathname) && showBottomNavMenu;

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
