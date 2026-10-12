import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { 
  Search, 
  Menu,
  CheckCheck, 
  Loader2, 
  X, 
  Edit3, 
  Megaphone,
  MoreVertical,
  Bot,
  ArrowDownToLine,
  ArrowDownLeft,
  MessageCircle,
  Settings,
  ChevronDown,
  UserRoundPlus,
  Info,
  Wallet,
  PlusCircle,
  Lightbulb,
  Download,
  CreditCard,
  Globe,
  Bell,
  MessagesSquare,
  HelpCircle,
  ShieldAlert,
  Smartphone,
  LogOut
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { COUNTRIES, detectCountryFromPhone } from '../lib/countries';

const hasImageAttachment = (message: any) => {
  let details = message?.detalhes;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      details = {};
    }
  }

  return Boolean(
    details?.imagem_url ||
    details?.photo_url ||
    message?.imagem_url ||
    message?.photo_url ||
    ['imagem', 'image', 'foto', 'photo'].includes(
      String(details?.tipo_midia || message?.tipo_midia || '').toLowerCase(),
    ),
  );
};

// Selo de verificação oficial da empresa (Telegram Blue)
const OfficialVerifiedBadge = ({ className = "w-[16px] h-[16px]" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`shrink-0 inline-block align-middle ml-1 select-none ${className}`}>
    <path
      fill="#2481cc"
      d="M10.26 2.45c.87-.6 2.05-.6 2.92 0l1.24.86c.4.28.88.42 1.37.4l1.51-.06c1.06-.04 1.98.63 2.23 1.66l.36 1.47c.12.48.38.9.76 1.21l1.17.97c.83.69 1.09 1.84.62 2.8l-.66 1.36c-.21.44-.27.94-.17 1.43l.31 1.48c.22 1.04-.37 2.07-1.41 2.47l-1.46.56c-.47.18-.86.51-1.12.94l-.79 1.3c-.56.92-1.68 1.32-2.7.98l-1.44-.48c-.46-.15-.96-.14-1.42.03l-1.43.52c-1.02.37-2.15-.01-2.73-.91l-.81-1.28c-.26-.42-.66-.74-1.13-.91l-1.47-.53c-1.05-.38-1.67-1.4-1.47-2.45l.28-1.49c.09-.48.05-.98-.14-1.43l-.63-1.38c-.45-.97-.16-2.11.69-2.78l1.19-.94c.39-.3.66-.72.79-1.19l.39-1.46c.27-1.02 1.21-1.67 2.26-1.6l1.51.09c.49.03.97-.1 1.38-.37l1.23-.88z"
    />
    <path
      fill="#ffffff"
      d="M9.5 12.5l-1.6-1.6a.8.8 0 0 0-1.13 1.13l2.17 2.17a.8.8 0 0 0 1.13 0l5.43-5.43a.8.8 0 0 0-1.13-1.13L9.5 12.5z"
    />
  </svg>
);

export default function ChatsList({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { isUserOnline } = usePresence();
  const { showToast } = useToast();
  const { statusText } = useNetworkStatus();

  // typingUsers: Map<contactId, true> — contatos que estão digitando agora
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [communityTypingUser, setCommunityTypingUser] = useState<string | null>(null);
  const communityTypingTimer = useRef<NodeJS.Timeout | null>(null);
  const notifiedCommunityMessageIds = useRef<Set<string>>(new Set());

  const outletContext = useOutletContext<{ openAutoMessages?: () => void }>();

  const CACHE_KEY_CONTACTS = user ? `tg_cache_contacts_${user.id}` : 'tg_cache_contacts';
  const CACHE_KEY_COMM_LAST = 'tg_cache_community_last_msg';

  const [contacts, setContacts] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(user ? `tg_cache_contacts_${user.id}` : 'tg_cache_contacts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(user ? `tg_cache_contacts_${user.id}` : 'tg_cache_contacts');
      return !(cached && JSON.parse(cached).length > 0);
    } catch {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigationDrawerOpen, setIsNavigationDrawerOpen] = useState(false);
  const [drawerPhone, setDrawerPhone] = useState(
    user?.phone || user?.user_metadata?.telefone || user?.user_metadata?.phone || "",
  );
  const drawerName = user?.user_metadata?.nome_exibicao
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ")
    || user?.phone
    || "Utilizador";
  const drawerAvatar = user?.user_metadata?.avatar_url
    || user?.user_metadata?.photo_url
    || user?.user_metadata?.picture
    || "";
  const formatDrawerPhone = (phone: string) => {
    const trimmedPhone = phone.trim();
    const detected = detectCountryFromPhone(trimmedPhone);
    if (detected.country && detected.nationalNumber) {
      return `${detected.country.dial_code} ${detected.nationalNumber}`;
    }

    const metadataCountryCode = user?.user_metadata?.country_code;
    const savedCountryCode = localStorage.getItem('saved_country_code');
    const countryCode = typeof metadataCountryCode === 'string' ? metadataCountryCode : savedCountryCode;
    const country = COUNTRIES.find((item) => item.code === countryCode?.toUpperCase());
    if (!country) return trimmedPhone;

    const digits = trimmedPhone.replace(/\D/g, '');
    const parsedInternational = detectCountryFromPhone(`+${digits}`);
    const nationalNumber = parsedInternational.country?.code === country.code
      ? parsedInternational.nationalNumber
      : digits;

    return `${country.dial_code} ${nationalNumber}`;
  };

  useEffect(() => {
    if (!isNavigationDrawerOpen || !user) return;
    let active = true;

    const loadDrawerPhone = async () => {
      const { data, error } = await supabase.rpc("get_my_account_data");
      if (error) {
        console.error("Erro ao carregar o telefone do perfil:", error);
        return;
      }
      const accountPhone = (data as any)?.[0]?.telefone;
      if (active && accountPhone) setDrawerPhone(accountPhone);
    };

    void loadDrawerPhone();
    return () => {
      active = false;
    };
  }, [isNavigationDrawerOpen, user]);
  const [communityLastMessage, setCommunityLastMessage] = useState<{
    text: string;
    sender: string;
    time: string;
    isMe: boolean;
    timestamp: number;
  }>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_COMM_LAST);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      text: "Bem-vindo à comunidade oficial de negócios e automações!",
      sender: "Equipe Telegram",
      time: "Hoje",
      isMe: false,
      timestamp: Date.now() - 1000 * 60 * 15
    };
  });
  
  // Abas oficiais conforme especificação da Fase 1:
  // Conversas | Grupos | Canais | Bots | Mensagens lidas
  type ChatFolder = 'all' | 'groups' | 'channels' | 'bots' | 'unread';
  const [activeFilter, setActiveFilter] = useState<ChatFolder>('all');

  const PAVEL_DUROV_ID = 'pavel-durov-ceo-00000000000000001';

  const formatSenderPhone = (p: string) => {
    if (!p) return 'Contacto';
    const clean = p.replace(/^\+?244\s*/, '').trim();
    if (/^\d{9}$/.test(clean)) {
      return `+244 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    return p;
  };

  const previewText = (text: string, max = 40) => {
    if (!text) return '';
    if (text.length <= max) return text;
    const truncated = text.slice(0, max);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
  };

  const formatTelegramTime = (dateInput: Date | string | number): string => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    
    // Mesmo dia: HH:MM
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    // Ontem: "ontem"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'ontem';
    }

    // Últimos 7 dias: dia da semana abreviado (seg., ter., qua., ...)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      return d.toLocaleDateString('pt-PT', { weekday: 'short' });
    }

    // Mais de 7 dias: DD/MM
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    const fetchCommunityLastMessage = async () => {
      try {
        const { data: latestMsg } = await supabase
          .from('chat_gruop')
          .select('mensagem, detalhes, data_registrada, uid_emissor')
          .order('data_registrada', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestMsg) {
          let senderLabel = "Membro";
          if (user && latestMsg.uid_emissor === user.id) {
            senderLabel = "Tu";
          } else {
            const { data: prof } = await supabase
              .from('sys_t500')
              .select('nome_exibicao, telefone')
              .eq('id', latestMsg.uid_emissor)
              .maybeSingle();
            if (prof?.nome_exibicao) {
              senderLabel = prof.nome_exibicao;
            } else if (prof?.telefone) {
              senderLabel = formatSenderPhone(prof.telefone);
            }
          }

          const text = hasImageAttachment(latestMsg) ? "Foto" : latestMsg.mensagem || "Mensagem";
          const msgTimestamp = new Date(latestMsg.data_registrada).getTime();

          const newMsg = {
            text,
            sender: senderLabel,
            time: formatTelegramTime(msgTimestamp),
            isMe: user ? latestMsg.uid_emissor === user.id : false,
            timestamp: msgTimestamp
          };
          setCommunityLastMessage(newMsg);
          try {
            localStorage.setItem(CACHE_KEY_COMM_LAST, JSON.stringify(newMsg));
          } catch {}
        }
      } catch (err) {
        console.error('Erro ao carregar última mensagem da comunidade:', err);
      }
    };

    fetchCommunityLastMessage();

    const notifyCommunityMessage = async (message: any) => {
      if (
        !message?.id ||
        !user ||
        message.uid_emissor === user.id ||
        !document.hidden ||
        !('Notification' in window) ||
        Notification.permission !== 'granted' ||
        !('serviceWorker' in navigator)
      ) return;

      const messageId = String(message.id);
      if (notifiedCommunityMessageIds.current.has(messageId)) return;
      notifiedCommunityMessageIds.current.add(messageId);
      if (notifiedCommunityMessageIds.current.size > 100) {
        const oldestId = notifiedCommunityMessageIds.current.values().next().value;
        if (oldestId) notifiedCommunityMessageIds.current.delete(oldestId);
      }

      try {
        const { data: profile, error } = await supabase
          .from('sys_t500')
          .select('nome_exibicao, telefone')
          .eq('id', message.uid_emissor)
          .maybeSingle();

        if (error) throw error;

        let details: any = message.detalhes || {};
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch {
            details = {};
          }
        }

        const senderName = profile?.nome_exibicao
          || (profile?.telefone ? formatSenderPhone(profile.telefone) : 'Membro');
        const messageText = typeof message.mensagem === 'string' ? message.mensagem.trim() : '';
        const body = messageText || (details.imagem_url || details.photo_url ? 'Enviou uma foto' : 'Enviou uma mensagem');
        const registration = await navigator.serviceWorker.ready;
        if (!document.hidden) return;

        await registration.showNotification(senderName, {
          body: body.slice(0, 240),
          icon: '/logo-tb.jpg',
          badge: '/logo-tb.jpg',
          tag: `community-message-${messageId}`,
          data: { url: '/web' }
        });
      } catch (error) {
        console.error('Não foi possível mostrar a notificação da comunidade:', error);
      }
    };

    const commChannel = supabase.channel('chatslist_community_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_gruop' }, (payload: any) => {
        fetchCommunityLastMessage();
        if (payload.eventType === 'INSERT') {
          void notifyCommunityMessage(payload.new);
        }
      })
      .subscribe();

    const handleSync = () => {
      fetchCommunityLastMessage();
    };
    window.addEventListener('online', handleSync);
    window.addEventListener('app:sync-data', handleSync);

    return () => {
      supabase.removeChannel(commChannel);
      window.removeEventListener('online', handleSync);
      window.removeEventListener('app:sync-data', handleSync);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        let uniqueContacts = new Map<string, any>();

        // 1. Buscar todos os membros e subordinados
        const { data: subData, error: subError } = await (supabase as any).rpc('get_my_subordinates_chat');
        if (!subError && subData && Array.isArray(subData)) {
          subData.forEach((sub: any) => {
            uniqueContacts.set(sub.membro_id, {
              id: sub.membro_id,
              telefone: sub.telefone,
              nome_exibicao: sub.nome_exibicao,
              nivel: sub.nivel,
              patrocinador_id: sub.patrocinador_id,
              patrocinador_telefone: sub.patrocinador_telefone,
              codigo_meu_refferal: sub.codigo_meu_refferal,
              data_registro: sub.data_registro,
              total_recarregado: sub.total_recarregado,
              isSubordinate: true
            });
          });
        }

        // 2. Buscar o patrocinador direto do utilizador (se houver)
        const { data: sponsorData } = await supabase
          .from('equipe_mcpn')
          .select('patrocinador_id')
          .eq('usuario_id', user.id);

        if (sponsorData && sponsorData.length > 0) {
          for (const item of sponsorData) {
            if (item.patrocinador_id && !uniqueContacts.has(item.patrocinador_id)) {
              const { data: pData } = await supabase
                .from('sys_t500')
                .select('telefone, nome_exibicao')
                .eq('id', item.patrocinador_id)
                .maybeSingle();

              if (pData?.telefone) {
                uniqueContacts.set(item.patrocinador_id, {
                  id: item.patrocinador_id,
                  telefone: pData.telefone,
                  nome_exibicao: pData.nome_exibicao,
                  isSponsor: true
                });
              }
            }
          }
        }

        // 3. Buscar as mensagens mais recentes trocadas
        try {
          const { data: lastMsgs } = await (supabase as any)
            .from('sys_t110')
            .select('*')
            .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(100);

          if (lastMsgs && lastMsgs.length > 0) {
            // Se houver mensagens com usuários não listados na equipe, buscar dados em sys_t500
            const missingIds: string[] = [];
            lastMsgs.forEach((msg: any) => {
              const otherId = msg.remetente_id === user.id ? msg.destinatario_id : msg.remetente_id;
              if (otherId && !uniqueContacts.has(otherId) && !missingIds.includes(otherId)) {
                missingIds.push(otherId);
              }
            });

            if (missingIds.length > 0) {
              const { data: missingUsers } = await supabase
                .from('sys_t500')
                .select('id, telefone, nome_exibicao')
                .in('id', missingIds);

              if (missingUsers) {
                missingUsers.forEach((u: any) => {
                  uniqueContacts.set(u.id, {
                    id: u.id,
                    telefone: u.telefone,
                    nome_exibicao: u.nome_exibicao,
                    isSubordinate: false
                  });
                });
              }
            }

            lastMsgs.forEach((msg: any) => {
              const otherId = msg.remetente_id === user.id ? msg.destinatario_id : msg.remetente_id;
              if (uniqueContacts.has(otherId)) {
                const existing = uniqueContacts.get(otherId);
                if (!existing.lastMessage) {
                  const msgTime = new Date(msg.created_at).getTime();
                  uniqueContacts.set(otherId, {
                    ...existing,
                    lastMessage: hasImageAttachment(msg) ? "Foto" : msg.mensagem,
                    lastMessageTime: formatTelegramTime(msgTime),
                    lastMessageTimestamp: msgTime,
                    isMe: msg.remetente_id === user.id
                  });
                }
              }
            });
          }
        } catch {}

        const sorted = Array.from(uniqueContacts.values()).sort((a: any, b: any) => {
          const timeA = a.lastMessageTimestamp ? Number(a.lastMessageTimestamp) : 0;
          const timeB = b.lastMessageTimestamp ? Number(b.lastMessageTimestamp) : 0;
          if (timeB !== timeA) return timeB - timeA;
          return (a.nivel || 99) - (b.nivel || 99);
        });

        setContacts(sorted);
        try {
          localStorage.setItem(CACHE_KEY_CONTACTS, JSON.stringify(sorted));
        } catch {}
      } catch (e) {
        console.error('Erro ao carregar contactos:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();

    const contactChannel = supabase.channel('chatslist_contacts_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110', filter: `destinatario_id=eq.${user.id}` }, () => {
        fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110', filter: `remetente_id=eq.${user.id}` }, () => {
        fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipe_mcpn', filter: `usuario_id=eq.${user.id}` }, () => {
        fetchContacts();
      })
      .subscribe();

    const handleSync = () => {
      fetchContacts();
    };
    window.addEventListener('online', handleSync);
    window.addEventListener('app:sync-data', handleSync);

    return () => {
      supabase.removeChannel(contactChannel);
      window.removeEventListener('online', handleSync);
      window.removeEventListener('app:sync-data', handleSync);
    };
  }, [user]);

  // ── Escuta "digitando..." de todos os contatos via Supabase Broadcast ──
  useEffect(() => {
    if (!user) return;

    // Cada conversa privada usa canal "typing_{sorted_pair}".
    // Aqui inscrevemos um canal wildcard por padrão do Supabase não existe,
    // então usamos um canal global de presença de typing que cada contato escreve.
    const channel = supabase.channel('chatslist_typing_global', {
      config: { broadcast: { ack: false } }
    })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const senderId: string = payload?.payload?.userId;
        const targetId: string = payload?.payload?.targetId;
        if (senderId && targetId === 'community') {
          const senderName = payload?.payload?.name || 'Alguém';
          setCommunityTypingUser(senderName);
          if (communityTypingTimer.current) clearTimeout(communityTypingTimer.current);
          communityTypingTimer.current = setTimeout(() => {
            setCommunityTypingUser(null);
            communityTypingTimer.current = null;
          }, 3000);
          return;
        }

        // Só processa se o evento é direcionado ao utilizador atual
        if (!senderId || targetId !== user.id) return;

        setTypingUsers(prev => ({ ...prev, [senderId]: true }));

        // Limpa o timer anterior para este remetente
        if (typingTimers.current[senderId]) {
          clearTimeout(typingTimers.current[senderId]);
        }
        // Auto-remove após 3s sem novo evento
        typingTimers.current[senderId] = setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Limpa todos os timers pendentes
      Object.values(typingTimers.current).forEach(t => clearTimeout(t));
      if (communityTypingTimer.current) clearTimeout(communityTypingTimer.current);
    };
  }, [user]);

  const getUserColor = (str: string) => {
    const colors = ["#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9", "#F39C12", "#7F8C8D"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Pesquisa dinâmica
  const queryClean = searchQuery.toLowerCase().trim();
  const queryDigits = queryClean.replace(/\D/g, '');

  const filteredContacts = useMemo(() => {
    if (activeFilter === 'groups' || activeFilter === 'channels' || activeFilter === 'bots') return [];

    let list = contacts;

    if (activeFilter === 'unread') {
      list = contacts.filter(c => !c.isMe && Boolean(c.lastMessage));
    }

    if (!queryClean) return list;

    return list.filter(c => {
      const rawTel = (c.telefone || '').toLowerCase();
      const formattedTel = formatSenderPhone(c.telefone).toLowerCase();
      const name = (c.nome_exibicao || '').toLowerCase();
      const digitsOnly = rawTel.replace(/\D/g, '');

      return (
        rawTel.includes(queryClean) ||
        formattedTel.includes(queryClean) ||
        name.includes(queryClean) ||
        (queryDigits.length > 0 && digitsOnly.includes(queryDigits))
      );
    });
  }, [contacts, queryClean, queryDigits, activeFilter]);

  // Estrutura das abas solicitadas: Conversas | Grupos | Canais | Bots | Mensagens lidas
  const folders: { id: ChatFolder; label: string; count?: number }[] = [
    { id: 'all', label: 'Conversas', count: contacts.length + 5 },
    { id: 'groups', label: 'Grupos', count: 1 },
    { id: 'channels', label: 'Canais', count: 1 },
    { id: 'bots', label: 'Bots', count: 3 },
    { id: 'unread', label: 'Mensagens lidas', count: contacts.filter(c => !c.isMe && Boolean(c.lastMessage)).length },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  // Lista de conversas com ordenação estrita por data/hora da mensagem mais recente (sem fixação permanente)
  const allConversations = useMemo(() => {
    // 1. Conversas do Sistema / Oficiais
    const systemChats = [
      {
        id: 'community-chat',
        folder: 'groups' as ChatFolder,
        name: 'Telegram Empresa',
        isVerified: true,
        lastMessage: communityLastMessage.text,
        senderPrefix: `${communityLastMessage.sender}: `,
        time: communityLastMessage.time,
        timestamp: communityLastMessage.timestamp,
        isMe: communityLastMessage.isMe,
        actionBtn: null,
        tag: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs shrink-0">
            <img src="/logo-tb.jpg" alt="Telegram" className="w-full h-full object-cover" />
          </div>
        ),
        onClick: () => navigate('/web')
      },
      {
        id: 'pavel-durov',
        folder: 'channels' as ChatFolder,
        name: 'Pavel Durov',
        isVerified: true,
        lastMessage: 'Fundador',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 20),
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
        isMe: false,
        actionBtn: null,
        tag: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs bg-[#2481cc]/20 border border-white/40">
            <img
              src="/pavel_durov.jpg"
              alt="Pavel Durov"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
              }}
            />
          </div>
        ),
        onClick: () => navigate('/canal-oficial')
      },
      {
        id: 'deposit-bot',
        folder: 'bots' as ChatFolder,
        name: 'Payments Bot',
        isVerified: true,
        tag: 'BOT',
        lastMessage: 'Recargas e depósitos automáticos via Multicaixa Express e IBAN.',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 36),
        timestamp: Date.now() - 1000 * 60 * 60 * 36,
        isMe: false,
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src="/logo-tb.jpg" 
              alt="Payments Bot" 
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: () => navigate('/sand-pay')
      },
      {
        id: 'withdrawal-bot',
        folder: 'bots' as ChatFolder,
        name: 'Wallet',
        isVerified: true,
        tag: 'BOT',
        lastMessage: 'Solicitações de saque e levantamentos rápidos para conta bancária.',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 48),
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        isMe: false,
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src="/logo-tb.jpg" 
              alt="Wallet" 
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: () => navigate('/carteira')
      },

      {
        id: 'botfather',
        folder: 'bots' as ChatFolder,
        name: 'BotFather',
        isVerified: true,
        tag: null,
        lastMessage: 'You have currently no bots',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 72),
        timestamp: Date.now() - 1000 * 60 * 60 * 72,
        isMe: false,
        isSubordinate: false,
        nivel: null,
        actionBtn: (
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/botfather'); }}
            className="shrink-0 px-3.5 py-1 rounded-full bg-[#2481cc] text-white text-[13px] font-medium leading-none cursor-pointer hover:bg-[#1e6eb0] active:bg-[#1a5e9a] transition-colors"
          >
            Abrir
          </button>
        ),
        avatar: (
          <div className="w-[52px] h-[52px] rounded-full overflow-hidden border border-gray-200/80 bg-white flex-shrink-0">
            <img 
              src="/BotFather.jpg" 
              alt="BotFather" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/botfather.png";
              }}
            />
          </div>
        ),
        onClick: () => navigate('/botfather')
      }
    ];

    // 2. Contatos com conversas ativas (que possuem mensagens trocadas)
    const activeContactChats = contacts
      .filter(c => Boolean(c.lastMessage))
      .map(c => {
        const color = getUserColor(c.telefone);
        const label = (c.telefone || '').replace(/\D/g, '').slice(-2) || '?';
        const isSub = Boolean(c.isSubordinate);
        const nv = c.nivel;
        const ts = c.lastMessageTimestamp ? Number(c.lastMessageTimestamp) : Date.now();

        return {
          id: `contact-${c.id}`,
          contactId: c.id,
          folder: 'all' as ChatFolder,
          name: c.nome_exibicao || formatSenderPhone(c.telefone),
          isVerified: false,
          tag: null,
          isSubordinate: isSub,
          nivel: nv,
          lastMessage: c.lastMessage,
          senderPrefix: null,
          time: formatTelegramTime(ts),
          timestamp: ts,
          isMe: c.isMe,
          actionBtn: null,
          avatar: (
            <div className="relative shrink-0">
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
                style={{ backgroundColor: color }}
              >
                {label}
              </div>
              {isSub && nv && (
                <div
                  className={`absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full border-2 border-white dark:border-[#17212b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                    nv === 1 ? 'bg-[#10b981]' : nv === 2 ? 'bg-[#3b82f6]' : 'bg-[#8b5cf6]'
                  }`}
                  title={`Subordinado de ${nv}º nível`}
                >
                  {nv}
                </div>
              )}
            </div>
          ),
          onClick: () => navigate(`/chat/${c.id}?t=${encodeURIComponent(c.telefone)}${nv ? `&nv=${nv}` : ''}`)
        };
      });

    // 3. Combina e ordena estritamente por timestamp decrescente (a conversa mais recente sempre em 1º lugar!)
    return [...systemChats, ...activeContactChats].sort((a, b) => b.timestamp - a.timestamp);
  }, [communityLastMessage, contacts, navigate]);

  const filteredChats = useMemo(() => {
    let list = allConversations;

    if (activeFilter === 'groups') {
      list = list.filter(c => c.folder === 'groups');
    } else if (activeFilter === 'channels') {
      list = list.filter(c => c.folder === 'channels');
    } else if (activeFilter === 'bots') {
      list = list.filter(c => c.folder === 'bots');
    } else if (activeFilter === 'unread') {
      list = list.filter(c => !c.isMe);
    }

    if (queryClean) {
      list = list.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(queryClean);
        const msgMatch = (c.lastMessage || '').toLowerCase().includes(queryClean);
        return nameMatch || msgMatch;
      });
    }

    return list;
  }, [allConversations, activeFilter, queryClean]);

  const idleContacts = useMemo(() => {
    if (activeFilter !== 'all') return [];
    return filteredContacts.filter(c => !c.lastMessage);
  }, [filteredContacts, activeFilter]);

  return (
    <div 
      className={`relative w-full bg-white dark:bg-[#17212b] font-sans antialiased flex flex-col transition-colors select-none tg-chat-no-select ${
        embedded ? "h-full min-h-0" : "min-h-[100dvh]"
      }`}
      onContextMenu={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <div className={`flex min-h-0 flex-1 flex-col ${embedded ? "" : "md:w-[350px] md:shrink-0 md:border-r md:border-gray-200 dark:md:border-[#202b36]"}`}>
      {/* ── TOP APP BAR OFICIAL DO TELEGRAM ── */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#242f3d] shadow-[0_1px_0_rgba(0,0,0,0.08)] select-none transition-colors">
        <div className="h-[56px] px-2 flex items-center justify-between gap-1">
          
          {/* Campo de Busca ativo com botão voltar ou Título Telegram */}
          {isSearching ? (
            <>
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer shrink-0"
                title="Voltar"
              >
                <X className="w-5 h-5 text-[#111] dark:text-white" />
              </button>

              <div className="flex-1 flex items-center bg-[#f1f1f1] dark:bg-[#1c2733] rounded-full px-3.5 py-1.5 mx-1">
                <Search className="w-4 h-4 text-[#707579] dark:text-[#9eaab6] mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar conversas, bots ou mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#111] dark:text-white placeholder:text-[#707579] outline-none border-none"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-[#aaa] hover:bg-[#999] text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center pl-2">
              {statusText ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#2481cc] dark:text-[#6ab3f3] animate-spin shrink-0" />
                  <h1 className="text-[17.5px] font-semibold tracking-tight text-[#2481cc] dark:text-[#6ab3f3]">
                    {statusText}
                  </h1>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsNavigationDrawerOpen(true)}
                    className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#707579] transition-colors hover:bg-black/5 dark:text-[#9eaab6] dark:hover:bg-white/5"
                    aria-label="Abrir menu de navegação"
                    aria-expanded={isNavigationDrawerOpen}
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                  <h1 className="text-[22px] font-bold tracking-tight text-[#2481cc] dark:text-[#6ab3f3]">
                    Telegram
                  </h1>
                </>
              )}
            </div>
          )}

          {/* Ações da Direita */}
          <div className="flex items-center gap-0">
            {!isSearching && (
              <button
                onClick={() => setIsSearching(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                title="Pesquisar"
              >
                <Search className="w-5 h-5 text-[#111] dark:text-white" />
              </button>
            )}

            <button
              onClick={() => {
                if (outletContext?.openAutoMessages) {
                  outletContext.openAutoMessages();
                } else {
                  navigate('/perfil');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              title="Mensagens Automáticas & Configurações"
            >
              <MoreVertical className="w-5 h-5 text-[#111] dark:text-white" />
            </button>
          </div>
        </div>

        {isNavigationDrawerOpen && (
          <div className="fixed inset-x-0 top-0 bottom-14 z-[100] md:inset-0" role="presentation">
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default bg-black/40"
              onClick={() => setIsNavigationDrawerOpen(false)}
              aria-label="Fechar menu"
            />
            <nav
              className="absolute inset-y-0 left-0 flex w-[280px] flex-col overflow-y-auto overscroll-contain bg-white pb-4 shadow-xl dark:bg-[#17212b] md:pb-4"
              aria-label="Navegação principal"
            >
              <div className="border-b border-gray-100 bg-[#2481cc] px-4 pb-3 pt-5 text-white dark:border-[#202b36] dark:bg-[#1c242f]">
                <button
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    navigate("/perfil");
                  }}
                  className="block w-full cursor-pointer text-left"
                  aria-label="Editar perfil"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[20px] font-semibold">
                      {drawerAvatar ? (
                        <img src={drawerAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        drawerName.trim().charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="pt-1 text-xl" aria-hidden="true">☼</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{drawerName}</p>
                      <p className="mt-0.5 truncate text-[13px] text-white/75">
                        {drawerPhone ? formatDrawerPhone(drawerPhone) : "Telefone não disponível"}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/80" />
                  </div>
                </button>
              </div>
              {[
                { label: "Grupo Telegram", path: "/web", icon: MessageCircle },
                { label: "Convidar amigos", path: "/contactos", icon: UserRoundPlus },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    navigate(path);
                  }}
                  className={`flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[15px] transition-colors hover:bg-gray-100 dark:hover:bg-white/5 ${
                    label === "Botfather" ? "text-[#2481cc] dark:text-[#2481cc]" : "text-[#222] dark:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${
                    label === "Botfather" ? "text-[#2481cc]" : "text-[#707579] dark:text-[#9eaab6]"
                  }`} />
                  {label}
                </button>
              ))}
              <div className="my-2 shrink-0 border-t border-gray-100 dark:border-[#202b36]" />
              {[
                { label: "Carteira wallet", path: "/carteira", icon: Wallet },
                { label: "Payment Wallet", path: "/sand-pay", icon: PlusCircle },
                { label: "Introdução ao Telegram", path: "/sobre-telegram business", icon: Lightbulb },
                { label: "Download APK", path: "/android?setln=pt", icon: Download },
                { label: "Carteira bancária", path: "/bank", icon: CreditCard },
                { label: "Notificações", action: "notifications", icon: Bell },
                { label: "Canal postes", path: "/canal-oficial", icon: MessagesSquare },
                { label: "Perguntas Frequentes", path: "/help-faq", icon: HelpCircle },
                { label: "Redefinir Senha", path: "/alterar-senha", icon: ShieldAlert },
                { label: "Definições", path: "/definicoes", icon: Settings },
                { label: "Idioma", path: "/definicoes", icon: Globe, state: { openLanguage: true } },
                { label: "Termo e privacidade", path: "/devices", icon: Smartphone },
              ].map(({ label, path, icon: Icon, state }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    if (label === "Notificações") {
                      if ("Notification" in window) {
                        Notification.requestPermission().then((permission) => {
                          showToast(
                            permission === "granted"
                              ? "Notificações ativadas"
                              : "Permissão para notificações não concedida",
                            permission === "granted" ? "success" : "info"
                          );
                        }).catch(() => showToast("Não foi possível atualizar as notificações", "error"));
                      } else {
                        showToast("Notificações não disponíveis neste dispositivo", "info");
                      }
                      return;
                    }
                    if (path) navigate(path, state ? { state } : undefined);
                  }}
                  className="flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[15px] text-[#222] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
                >
                  <Icon className="h-5 w-5 text-[#707579] dark:text-[#9eaab6]" />
                  {label}
                </button>
              ))}
              <div className="my-2 shrink-0 border-t border-gray-100 dark:border-[#202b36]" />
              {[
                { label: "Sobre o Telegram", path: "/sobre-telegram business", icon: Info },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    navigate(path);
                  }}
                  className="flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[15px] text-[#222] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
                >
                  <Icon className="h-5 w-5 text-[#707579] dark:text-[#9eaab6]" />
                  {label}
                </button>
              ))}
              <div className="my-2 shrink-0 border-t border-gray-100 dark:border-[#202b36]" />
              <button
                type="button"
                onClick={async () => {
                  setIsNavigationDrawerOpen(false);
                  const { error } = await supabase.auth.signOut();
                  if (error) {
                    showToast("Não foi possível terminar a sessão", "error");
                    return;
                  }
                  showToast("Sessão terminada com sucesso", "success");
                  navigate("/login");
                }}
                className="flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[15px] text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <LogOut className="h-5 w-5" />
                Terminar sessão
              </button>
            </nav>
          </div>
        )}

        {/* ── ABAS SUPERIORES ── */}
        <div className="flex overflow-x-auto no-scrollbar px-2 bg-white dark:bg-[#242f3d] border-t border-[#e8e8e8] dark:border-white/10">
          {folders.map(folder => {
            const isActive = activeFilter === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFilter(folder.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[14px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#2481cc] dark:text-[#6ab3f3] font-semibold'
                    : 'text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] dark:hover:text-[#6ab3f3]'
                }`}
              >
                <span>{folder.label}</span>
                {typeof folder.count === 'number' && folder.count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0 rounded-full font-bold leading-[18px] min-w-[18px] text-center ${
                    isActive
                      ? 'bg-[#2481cc] dark:bg-[#6ab3f3] text-white'
                      : 'bg-[#d9d9d9] dark:bg-white/20 text-[#707579] dark:text-white'
                  }`}>
                    {folder.count}
                  </span>
                )}
                {/* Indicador ativo inferior */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2481cc] dark:bg-[#6ab3f3] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── CORPO PRINCIPAL DE CHATS (ORDENAÇÃO DINÂMICA SEM CONVERSAS FIXAS) ── */}
      <main className={`w-full flex-1 overflow-y-auto ${embedded ? "pb-2" : "pb-20"}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <Loader2 className="w-7 h-7 text-[#2481cc] animate-spin" />
            <span className="text-[13px] text-[#707579] dark:text-[#9eaab6]">Carregando conversas...</span>
          </div>
        ) : (
          <>
            {/* 1. Lista de conversas ativas ordenadas por recência */}
            {filteredChats.map((chat) => {
              const rawId = chat.id.startsWith('contact-') ? chat.id.replace('contact-', '') : null;
              const isOnline = rawId ? isUserOnline(rawId) : false;
              const isSub = Boolean(chat.isSubordinate);
              const nv = chat.nivel;

              return (
                <div
                  key={chat.id}
                  onClick={chat.onClick}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
                >
                  <div className="relative shrink-0">
                    {chat.avatar}
                  </div>

                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[15.5px] font-medium text-[#111] dark:text-white truncate leading-tight">
                          {chat.name}
                        </h3>
                        {isOnline && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#10b981]" title="Online agora" />
                        )}
                        {chat.isVerified && <OfficialVerifiedBadge />}
                        {chat.tag && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-[#2481cc] text-white">
                            {chat.tag}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {chat.isMe && (
                          <CheckCheck className="w-4 h-4 text-[#2481cc] stroke-[2.5]" />
                        )}
                        <span className="text-[12px] text-[#707579] dark:text-[#9eaab6]">
                          {chat.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {(() => {
                        const isCommunityTyping = chat.id === 'community-chat' && communityTypingUser;
                        const isTyping = rawId ? Boolean(typingUsers[rawId]) : false;
                        return (
                          <p className="text-[13.5px] truncate leading-snug overflow-hidden whitespace-nowrap">
                            {isCommunityTyping ? (
                              <span className="text-[#4dcd5e] font-medium italic">{communityTypingUser} está digitando...</span>
                            ) : isTyping ? (
                              <span className="text-[#4dcd5e] font-medium italic">digitando...</span>
                            ) : (
                              <span className="text-[#707579] dark:text-[#9eaab6]">
                                {chat.senderPrefix && (
                                  <span className="text-[#2481cc] font-medium">{chat.senderPrefix}</span>
                                )}
                                {previewText(chat.lastMessage || '')}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                      {chat.actionBtn}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. Seção de contatos (sem conversas recentes iniciadas) */}
            {activeFilter === 'all' && idleContacts.length > 0 && (
              <>
                <div className="px-4 py-2 bg-[#f4f4f5] dark:bg-[#1a2330] border-b border-gray-100/80 dark:border-[#202b36]">
                  <span className="text-[13px] font-medium text-[#2481cc] dark:text-[#6ab3f3]">
                    Seus contatos no Telegram
                  </span>
                </div>

                {idleContacts.map((contact) => {
                  const color = getUserColor(contact.telefone);
                  const label = (contact.telefone || '').replace(/\D/g, '').slice(-2) || '?';
                  const isSub = Boolean(contact.isSubordinate);
                  const nv = contact.nivel;
                  const isOnline = isUserOnline(contact.id);

                  return (
                    <div
                      key={contact.id}
                      onClick={() => navigate(`/chat/${contact.id}?t=${encodeURIComponent(contact.telefone)}${nv ? `&nv=${nv}` : ''}`)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
                    >
                      <div className="relative shrink-0">
                        <div
                          className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {label}
                        </div>

                        {isSub && nv && (
                          <div
                            className={`absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full border-2 border-white dark:border-[#17212b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                              nv === 1 ? 'bg-[#10b981]' : nv === 2 ? 'bg-[#3b82f6]' : 'bg-[#8b5cf6]'
                            }`}
                            title={`Subordinado de ${nv}º nível`}
                          >
                            {nv}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <h3 className="text-[15px] font-medium text-[#111] dark:text-white truncate leading-tight">
                              {contact.nome_exibicao || formatSenderPhone(contact.telefone)}
                            </h3>
                            {isOnline && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[#10b981]" title="Online agora" />
                            )}
                          </div>
                        </div>

                        <p className="text-[13px] leading-snug mt-[1px] truncate">
                          {typingUsers[contact.id] ? (
                            <span className="text-[#4dcd5e] font-medium italic">digitando...</span>
                          ) : (
                            <span className="text-[#707579] dark:text-[#9eaab6]">
                              visto às {timeStr}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Feedback quando a busca não encontra nada */}
            {searchQuery && filteredChats.length === 0 && idleContacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-[#707579] dark:text-[#9eaab6] text-[15px] mb-2">
                  Nenhum resultado encontrado para "<strong>{searchQuery}</strong>"
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#2481cc] text-[14px] font-semibold cursor-pointer"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {!embedded && (
        <>
          {/* ── BOTÃO DE AÇÃO FLUTUANTE OFICIAL DO TELEGRAM (FAB LÁPIS) ── */}
          <button
            onClick={() => {
              showToast('Iniciando novo chat...', 'info');
              navigate('/web');
            }}
            className="fixed bottom-[74px] right-4 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] text-white shadow-[0_4px_16px_rgba(36,129,204,0.45)] transition-all hover:scale-105 active:scale-95"
            title="Nova Conversa"
            aria-label="Nova Conversa"
          >
            <Edit3 className="h-5 w-5 stroke-[1.8]" />
          </button>
        </>
      )}
      </div>
    </div>
  );
}
