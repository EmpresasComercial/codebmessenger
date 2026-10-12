import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
export default function Layout() {
  const location = useLocation();

  // Rotas onde a barra de navegação inferior oficial do Telegram deve ser exibida
  // Ao acessar /contactos ou /bot-pay, a barra some para deixar a página limpa com botão voltar
  const mainTabPaths = [
    '/org',
    '/telegramBussiness',
    '/telegramBusiness',
    '/telegram-business',
    '/perfil',
    '/settings',
    '/configuracoes-conta'
  ];

  const isChatRoom = location.pathname.startsWith('/chat/') || 
                     location.pathname === '/webgrupo';

  const showNavbar = !isChatRoom && mainTabPaths.includes(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#17212b] font-sans text-[#111827] dark:text-[#f3f4f6] antialiased">
      {/* ── SHELL FULL-WIDTH 100% SEM LIMITES OU BORDAS LATERAIS ── */}
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
