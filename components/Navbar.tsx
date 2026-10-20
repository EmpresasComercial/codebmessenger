import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, UserRound, Sparkles, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number | null>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setUnreadMessagesCount(0);
      return;
    }

    let active = true;
    const fetchUnreadMessagesCount = async () => {
      const { count, error } = await (supabase as any)
        .from('sys_t110')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', userId)
        .neq('remetente_id', userId)
        .eq('detalhes->>lida', 'false');

      if (error) {
        logger.error('Navbar', 'Não foi possível carregar a contagem de mensagens não lidas:', error);
        return;
      }

      if (active) setUnreadMessagesCount(count ?? 0);
    };

    void fetchUnreadMessagesCount();
    const unreadChannel = supabase
      .channel(`navbar_unread_messages_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sys_t110', filter: `destinatario_id=eq.${userId}` },
        () => {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => void fetchUnreadMessagesCount(), 500);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.error('Navbar', `Falha na sincronização de mensagens não lidas: ${status}`);
        }
      });

    return () => {
      active = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      void supabase.removeChannel(unreadChannel);
    };
  }, [session?.user?.id]);

  const navItems = [
    {
      name: t('nav.home'),
      path: '/conversas',
      aliasPaths: ['/conversas', '/org', '/telegramBussiness', '/telegramBusiness', '/telegram-business'],
      icon: (isActive: boolean) => <MessageCircle aria-hidden="true" className={`w-[22px] h-[22px] transition-colors ${isActive ? 'fill-[#2481cc] stroke-[#2481cc]' : 'fill-transparent'}`} strokeWidth={2} />,
      badge: unreadMessagesCount
    },
    {
      name: t('nav.invite'),
      path: '/contactos',
      aliasPaths: ['/contactos', '/convite'],
      icon: (isActive: boolean) => <Users aria-hidden="true" className={`w-[22px] h-[22px] transition-colors ${isActive ? 'fill-[#2481cc] stroke-[#2481cc]' : 'fill-transparent'}`} strokeWidth={2} />
    },
    {
      name: t('nav.products'),
      path: '/botfather',
      aliasPaths: ['/botfather', '/bot-pay', '/operacoes'],
      icon: (isActive: boolean) => <Sparkles aria-hidden="true" className={`w-[22px] h-[22px] transition-colors ${isActive ? 'fill-[#2481cc] stroke-[#2481cc]' : 'fill-transparent'}`} strokeWidth={2} />
    },
    {
      name: t('nav.profile'),
      path: '/definicoes',
      aliasPaths: ['/definicoes', '/perfil', '/settings', '/configuracoes-conta'],
      icon: (isActive: boolean) => <UserRound aria-hidden="true" className={`w-[22px] h-[22px] transition-colors ${isActive ? 'fill-[#2481cc] stroke-[#2481cc]' : 'fill-transparent'}`} strokeWidth={2} />
    }
  ];

  // Show the floating compose button on the chat list.
  const showFab = ['/conversas', '/org', '/telegramBussiness', '/telegramBusiness', '/telegram-business'].includes(location.pathname);

  return (
    <>
      {/* Floating compose button */}
      {showFab && (
        <button
          type="button"
          onClick={() => navigate('/grupo')}
          className="fixed bottom-[72px] right-4 sm:right-6 z-40 w-12 h-12 rounded-full bg-[#50a8eb] dark:bg-[#50a8eb] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(80,168,235,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={t('nav.new_message')}
          aria-label={t('nav.new_message')}
        >
          <Plus className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}

      {/* Bottom navigation */}
      <nav
        aria-label={t('chat.main_navigation')}
        className="fixed bottom-0 left-0 right-0 w-full z-50 h-[56px] bg-white dark:bg-[#1c242f] border-t border-black/5 dark:border-[#000000]/30 flex items-center justify-around px-2 select-none shadow-[0_-1px_3px_rgba(0,0,0,0.02)]"
      >
        {navItems.map((item) => {
          const isActive = item.aliasPaths.some(p =>
            location.pathname === p || location.pathname.startsWith(`${p}/`)
          );

          return (
            <NavLink
              key={item.name}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center h-full transition-colors cursor-pointer group",
                isActive
                  ? "text-[#2481cc] dark:text-[#5288c1]"
                  : "text-[#707579] dark:text-[#8e9aa5] hover:text-[#2481cc]"
              )}
            >
              <div className="relative flex items-center justify-center mt-1">
                {typeof item.icon === 'function' ? item.icon(isActive) : item.icon}
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#3390ec] text-white text-[11px] font-bold px-[5px] py-[1px] rounded-full leading-none shadow-[0_0_0_2px_#ffffff] dark:shadow-[0_0_0_2px_#1c242f]">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium tracking-tight mt-0.5",
                isActive ? "font-bold" : ""
              )}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
