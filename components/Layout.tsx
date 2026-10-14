import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
export default function Layout() {
  const location = useLocation();

  // Rotas onde a barra de navegaÃ§Ã£o inferior oficial do Telegram deve ser exibida
  // Ao acessar /contactos ou /bot-pay, a barra some para deixar a pÃ¡gina limpa com botÃ£o voltar
  const mainTabPaths = [
    '/conversas',
    '/telegramBussiness',
    '/telegramBusiness',
    '/telegram-business',
    '/perfil',
    '/settings',
    '/configuracoes-conta'
  ];

  const isChatRoom = location.pathname.startsWith('/chat/') ||
                     location.pathname.toLowerCase() === '/grupo';

  const showNavbar = !isChatRoom && mainTabPaths.includes(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#17212b] font-sans text-[#111827] dark:text-[#f3f4f6] antialiased">
      {/* â”€â”€ SHELL FULL-WIDTH 100% SEM LIMITES OU BORDAS LATERAIS â”€â”€ */}
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

