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
  Plus,
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
  Download,
  CreditCard,
  Globe,
  Bell,
  MessagesSquare,
  ShieldAlert,
  Smartphone,
  Moon,
  Sun,
  ZoomIn,
  Palette
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { COUNTRIES, detectCountryFromPhone } from '../lib/countries';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';
import { isVerifiedManagerPhone } from '../lib/verifiedManager';
import VerifiedBadge from '../components/VerifiedBadge';
import ZoomSettingsModal from '../components/ZoomSettingsModal';
import ThemeSettingsScreen from '../components/ThemeSettingsScreen';
import { CHAT_ACTIVITY_EVENT, loadChatActivities, type ChatActivity } from '../lib/chatActivity';
import { COMMUNITY_CHAT_AVATAR, DEFAULT_PROFILE_AVATAR, PAYMENT_BOT_AVATAR, WITHDRAWAL_BOT_AVATAR, getProfileAvatarUrl } from '../lib/utils';
import { formatNotificationSenderTitle } from '../lib/notificationFormatting';

const getMessageDetails = (message: any) => {
  let details = message?.detalhes;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      details = {};
    }
  }
  return details && typeof details === 'object' ? details : {};
};

const hasImageAttachment = (message: any) => {
  const details = getMessageDetails(message);

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

const hasPdfAttachment = (message: any) => {
  const details = getMessageDetails(message);
  const files = Array.isArray(details.arquivos) ? details.arquivos : [details];
  return files.some((file: any) =>
    file?.tipo_mime === 'application/pdf' ||
    file?.mime_type === 'application/pdf' ||
    file?.content_type === 'application/pdf' ||
    String(file?.nome_arquivo || file?.file_name || file?.filename || '').toLowerCase().endsWith('.pdf')
  );
};

const getMessagePreview = (message: any) => {
  if (hasPdfAttachment(message)) return 'Ficheiro: PDF';
  if (hasImageAttachment(message)) return 'Foto';
  const text = typeof message?.mensagem === 'string' ? message.mensagem.trim() : '';
  return text || 'Enviou uma mensagem';
};

export default function ChatsList({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { isUserOnline } = usePresence();
  const { showToast } = useToast();
  const { t, darkMode, setDarkMode } = useLanguage();
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
  const clearOfflineMessageCaches = () => {
    if (!user || typeof navigator === 'undefined' || !navigator.onLine) return;

    const privateCachePrefix = `private_chat_${user.id}_`;
    const privateCacheKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(privateCachePrefix)));

    privateCacheKeys.forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        const messages = cached ? JSON.parse(cached) : [];
        const pending = Array.isArray(messages)
          ? messages.filter((message: any) =>
            typeof message.id === 'string' &&
            message.id.startsWith('local_') &&
            (message.status === 'sending' || message.status === 'failed')
          )
          : [];

        if (pending.length > 0) {
          localStorage.setItem(key, JSON.stringify(pending));
        } else {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`Não foi possível limpar o cache offline da conversa ${key}:`, error);
      }
    });

    try {
      const cachedGroup = localStorage.getItem('community_chat_cache');
      const groupMessages = cachedGroup ? JSON.parse(cachedGroup) : [];
      const pendingGroupMessages = Array.isArray(groupMessages)
        ? groupMessages.filter((message: any) =>
          typeof message.id === 'number' &&
          message.id > 1000000000000 &&
          (message.status === 'sending' || message.status === 'failed')
        )
        : [];

      if (pendingGroupMessages.length > 0) {
        localStorage.setItem('community_chat_cache', JSON.stringify(pendingGroupMessages));
      } else {
        localStorage.removeItem('community_chat_cache');
      }
    } catch (error) {
      console.error('Não foi possível limpar o cache offline do grupo:', error);
    }

    localStorage.removeItem(CACHE_KEY_CONTACTS);
    localStorage.removeItem(CACHE_KEY_COMM_LAST);
  };

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
  const [isMessageSearchLoading, setIsMessageSearchLoading] = useState(false);
  const [messageSearchHits, setMessageSearchHits] = useState<Record<string, { text: string; timestamp: number }>>({});
  const [messageSearchProfiles, setMessageSearchProfiles] = useState<Record<string, any>>({});
  const [unreadContactIds, setUnreadContactIds] = useState<Set<string>>(() => new Set());
  const [chatActivities, setChatActivities] = useState<Record<string, ChatActivity>>(
    () => loadChatActivities(user?.id),
  );
  const [isNavigationDrawerOpen, setIsNavigationDrawerOpen] = useState(false);
  const [isZoomSettingsOpen, setIsZoomSettingsOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<{
    src: string | null;
    name: string;
    label: string;
    color: string;
  } | null>(null);
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
    || DEFAULT_PROFILE_AVATAR;
  useEffect(() => {
    if (!avatarPreview) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAvatarPreview(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [avatarPreview]);

  const getProfileCountryCode = (metadata: unknown): string | undefined => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const values = metadata as Record<string, unknown>;
    const countryCode = values.country_code ?? values.countryCode;
    return typeof countryCode === 'string' ? countryCode.toUpperCase() : undefined;
  };
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
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return {
        text: '',
        sender: '',
        time: '',
        isMe: false,
        timestamp: 0,
      };
    }
    try {
      const cached = localStorage.getItem(CACHE_KEY_COMM_LAST);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      text: '',
      sender: '',
      time: '',
      isMe: false,
      timestamp: 0
    };
  });
  // Abas oficiais conforme especificação da Fase 1:
  // Conversas | Grupos | Canais | Bots | Mensagens não lidas
  type ChatFolder = 'all' | 'groups' | 'bots' | 'unread';
  const [activeFilter, setActiveFilter] = useState<ChatFolder>('all');

  const formatSenderPhone = (phone?: string | null, countryCode?: string) => {
    const rawPhone = phone?.trim();
    if (!rawPhone) return 'Contacto';

    const country = COUNTRIES.find((item) => item.code === countryCode?.toUpperCase());
    const digits = rawPhone.replace(/\D/g, '');
    const parsedDigitsAsInternational = digits ? parsePhoneNumberFromString(`+${digits}`) : undefined;
    const matchingCallingCode = COUNTRIES.some((item) => {
      const callingCode = item.dial_code.replace(/\D/g, '');
      if (!digits.startsWith(callingCode) || digits.length <= callingCode.length + 5) return false;

      const matchesSelectedCountry = country?.dial_code.replace(/\D/g, '') === callingCode;
      return !country || matchesSelectedCountry || parsedDigitsAsInternational?.isValid() === true;
    });
    const internationalPhone = rawPhone.startsWith('+')
      ? rawPhone
      : /^00/.test(rawPhone)
        ? `+${rawPhone.slice(2).replace(/\D/g, '')}`
        : matchingCallingCode
          ? `+${digits}`
          : undefined;
    const parsed = internationalPhone
      ? parsePhoneNumberFromString(internationalPhone)
      : country
        ? parsePhoneNumberFromString(rawPhone, country.code as CountryCode)
        : undefined;

    return parsed ? parsed.formatInternational() : rawPhone;
  };

  const formatCommunityNotificationTitle = (profile: any) => {
    const name = typeof profile?.nome_exibicao === 'string' ? profile.nome_exibicao.trim() : '';
    const phone = formatSenderPhone(profile?.telefone, getProfileCountryCode(profile?.metadados));
    return formatNotificationSenderTitle(name, phone);
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
        const { data: latestMsg, error } = await supabase
          .from('chat_gruop')
          .select('mensagem, detalhes, data_registrada, uid_emissor')
          .order('data_registrada', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;

        if (latestMsg) {
          let senderLabel = "Membro";
          if (user && latestMsg.uid_emissor === user.id) {
            senderLabel = "Tu";
          } else {
            const { data: prof } = await supabase
              .from('nucleo')
              .select('*')
              .eq('id', latestMsg.uid_emissor)
              .maybeSingle();
            if (prof?.nome_exibicao) {
              senderLabel = prof.nome_exibicao;
            } else if (prof?.telefone) {
              senderLabel = formatSenderPhone(prof.telefone, getProfileCountryCode(prof.metadados));
            }
          }

          const text = getMessagePreview(latestMsg);
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
        } else {
          const emptyState = {
            text: '',
            sender: '',
            time: '',
            isMe: false,
            timestamp: 0,
          };
          setCommunityLastMessage(emptyState);
          localStorage.removeItem(CACHE_KEY_COMM_LAST);
        }
      } catch (err) {
        console.error('Erro ao carregar última mensagem da comunidade:', err);
      }
    };

    if (navigator.onLine) {
      clearOfflineMessageCaches();
    }
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
          .from('nucleo')
          .select('*')
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

        const senderTitle = formatCommunityNotificationTitle(profile);
        const messageText = typeof message.mensagem === 'string' ? message.mensagem.trim() : '';
        const body = hasPdfAttachment(message)
          ? 'Ficheiro: PDF'
          : messageText || (details.imagem_url || details.photo_url ? 'Enviou uma foto' : 'Enviou uma mensagem');
        const registration = await navigator.serviceWorker.ready;
        if (!document.hidden) return;

        await registration.showNotification(senderTitle, {
          body: body.slice(0, 240),
          icon: COMMUNITY_CHAT_AVATAR,
          badge: '/notification-badge.svg',
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
      if (!navigator.onLine) return;
      localStorage.removeItem(CACHE_KEY_COMM_LAST);
      setCommunityLastMessage({
        text: '',
        sender: '',
        time: '',
        isMe: false,
        timestamp: 0,
      });
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
              avatarUrl: getProfileAvatarUrl(sub),
              countryCode: getProfileCountryCode(sub.metadados) || getProfileCountryCode(sub),
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
                .from('nucleo')
                .select('*')
                .eq('id', item.patrocinador_id)
                .maybeSingle();

              if (pData?.telefone) {
                uniqueContacts.set(item.patrocinador_id, {
                  id: item.patrocinador_id,
                  telefone: pData.telefone,
                  avatarUrl: getProfileAvatarUrl(pData),
                  countryCode: getProfileCountryCode(pData.metadados),
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
                .from('nucleo')
                .select('*')
                .in('id', missingIds);

              if (missingUsers) {
                missingUsers.forEach((u: any) => {
                  uniqueContacts.set(u.id, {
                    id: u.id,
                    telefone: u.telefone,
                    avatarUrl: getProfileAvatarUrl(u),
                    countryCode: getProfileCountryCode(u.metadados),
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
                    lastMessage: getMessagePreview(msg),
                    lastMessageTime: formatTelegramTime(msgTime),
                    lastMessageTimestamp: msgTime,
                    isMe: msg.remetente_id === user.id
                  });
                }
              }
            });
          }
        } catch {}

        const contactsMissingProfileData = Array.from(uniqueContacts.values())
          .filter((contact: any) => !contact.countryCode || !contact.avatarUrl)
          .map((contact: any) => contact.id);
        if (contactsMissingProfileData.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('nucleo')
            .select('*')
            .in('id', contactsMissingProfileData);

          if (profilesError) {
            console.error('Erro ao carregar os perfis dos contactos:', profilesError);
          } else {
            profiles?.forEach((profile) => {
              const contact = uniqueContacts.get(profile.id);
              const countryCode = getProfileCountryCode(profile.metadados);
              const avatarUrl = getProfileAvatarUrl(profile);
              if (contact && (countryCode || avatarUrl)) {
                uniqueContacts.set(profile.id, {
                  ...contact,
                  ...(countryCode ? { countryCode } : {}),
                  ...(avatarUrl ? { avatarUrl } : {}),
                });
              }
            });
          }
        }

        const { data: unreadMessages, error: unreadError } = await (supabase as any)
          .from('sys_t110')
          .select('remetente_id')
          .eq('destinatario_id', user.id)
          .neq('remetente_id', user.id)
          .eq('detalhes->>lida', 'false');
        if (unreadError) {
          console.error('Não foi possível carregar as mensagens não lidas:', unreadError);
        } else {
          setUnreadContactIds(new Set((unreadMessages || []).map((message: any) => String(message.remetente_id))));
        }

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

    const contactChannel = supabase.channel(`chatslist_contacts_sync_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110', filter: `destinatario_id=eq.${user.id}` }, () => {
        fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110', filter: `remetente_id=eq.${user.id}` }, () => {
        fetchContacts();
      })
      .subscribe();

    const handleSync = () => {
      if (!navigator.onLine) return;
      clearOfflineMessageCaches();
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

  useEffect(() => {
    if (!user || !queryClean) {
      setMessageSearchHits({});
      setMessageSearchProfiles({});
      setIsMessageSearchLoading(false);
      return;
    }

    let active = true;
    setMessageSearchHits({});
    setMessageSearchProfiles({});
    setIsMessageSearchLoading(true);

    const timer = setTimeout(async () => {
      const escapedQuery = queryClean.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${escapedQuery}%`;

      try {
        const [privateResult, communityResult] = await Promise.all([
          (supabase as any)
            .from('sys_t110')
            .select('id,mensagem,remetente_id,destinatario_id,created_at')
            .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
            .ilike('mensagem', pattern)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('chat_gruop')
            .select('id,mensagem,data_registrada')
            .ilike('mensagem', pattern)
            .order('data_registrada', { ascending: false })
            .limit(50),
        ]);

        if (privateResult.error) throw privateResult.error;
        if (communityResult.error) throw communityResult.error;

        const hits: Record<string, { text: string; timestamp: number }> = {};
        const matchedContactIds = new Set<string>();
        (privateResult.data || []).forEach((message: any) => {
          const contactId = message.remetente_id === user.id ? message.destinatario_id : message.remetente_id;
          if (!contactId || matchedContactIds.has(contactId)) return;
          matchedContactIds.add(contactId);
          hits[contactId] = {
            text: String(message.mensagem || ''),
            timestamp: new Date(message.created_at).getTime(),
          };
        });
        if (communityResult.data?.length) {
          const message = communityResult.data[0];
          hits['community-chat'] = {
            text: String(message.mensagem || ''),
            timestamp: new Date(message.data_registrada).getTime(),
          };
        }

        const knownContactIds = new Set(contacts.map((contact) => String(contact.id)));
        const missingProfileIds = [...matchedContactIds].filter((id) => !knownContactIds.has(id));
        let profiles: Record<string, any> = {};
        if (missingProfileIds.length > 0) {
          const { data, error } = await supabase
            .from('nucleo')
            .select('*')
            .in('id', missingProfileIds);
          if (error) throw error;
          profiles = Object.fromEntries((data || []).map((profile: any) => [profile.id, profile]));
        }

        if (active) {
          setMessageSearchHits(hits);
          setMessageSearchProfiles(profiles);
        }
      } catch (error) {
        console.error('Não foi possível pesquisar mensagens:', error);
        if (active) {
          setMessageSearchHits({});
          setMessageSearchProfiles({});
        }
      } finally {
        if (active) setIsMessageSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [queryClean, user?.id, contacts]);

  const filteredContacts = useMemo(() => {
    if (activeFilter === 'groups' || activeFilter === 'bots') return [];

    let list = contacts;

    if (activeFilter === 'unread') {
      list = contacts.filter(c => unreadContactIds.has(String(c.id)));
    }

    if (!queryClean) return list;

    return list.filter(c => {
      const rawTel = (c.telefone || '').toLowerCase();
      const formattedTel = formatSenderPhone(c.telefone, c.countryCode).toLowerCase();
      const name = (c.nome_exibicao || '').toLowerCase();
      const digitsOnly = rawTel.replace(/\D/g, '');

      return (
        rawTel.includes(queryClean) ||
        formattedTel.includes(queryClean) ||
        name.includes(queryClean) ||
        (queryDigits.length > 0 && digitsOnly.includes(queryDigits))
      );
    });
  }, [contacts, queryClean, queryDigits, activeFilter, unreadContactIds]);

  // Estrutura das abas de conversas disponíveis.
  const folders: { id: ChatFolder; label: string; count?: number }[] = [
    { id: 'all', label: t('chat.tab_chats'), count: contacts.length + 4 },
    { id: 'groups', label: t('chat.tab_groups'), count: 1 },
    { id: 'bots', label: t('chat.tab_bots'), count: 3 },
    { id: 'unread', label: t('chat.tab_unread'), count: unreadContactIds.size },
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
        name: 'Grupo de discursão',
        isVerified: true,
        lastMessage: communityLastMessage.text,
        senderPrefix: communityLastMessage.sender ? `${communityLastMessage.sender}: ` : null,
        time: communityLastMessage.time,
        timestamp: communityLastMessage.timestamp,
        isMe: communityLastMessage.isMe,
        avatarUrl: COMMUNITY_CHAT_AVATAR,
        avatarLabel: 'T',
        avatarColor: '#2481cc',
        actionBtn: null,
        tag: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs shrink-0">
            <img src={COMMUNITY_CHAT_AVATAR} alt="Grupo de discursão" className="w-full h-full object-cover" />
          </div>
        ),
        onClick: () => navigate('/web')
      },
      {
        id: 'deposit-bot',
        folder: 'bots' as ChatFolder,
        name: '+44 7722211733',
        isVerified: true,
        tag: null,
        lastMessage: 'Recargas e depósitos automáticos via Multicaixa Express e IBAN.',
        senderPrefix: null,
        time: formatTelegramTime(chatActivities['deposit-bot']?.timestamp || Date.now() - 1000 * 60 * 60 * 36),
        timestamp: chatActivities['deposit-bot']?.timestamp || Date.now() - 1000 * 60 * 60 * 36,
        isMe: false,
        avatarUrl: PAYMENT_BOT_AVATAR,
        avatarLabel: 'P',
        avatarColor: '#2481cc',
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src={PAYMENT_BOT_AVATAR}
              alt="+44 7722211733"
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: () => navigate('/sand-pay')
      },
      {
        id: 'withdrawal-bot',
        folder: 'bots' as ChatFolder,
        name: '+44 7721452217',
        isVerified: true,
        tag: null,
        lastMessage: 'Solicitações de saque e levantamentos rápidos para conta bancária.',
        senderPrefix: null,
        time: formatTelegramTime(chatActivities['withdrawal-bot']?.timestamp || Date.now() - 1000 * 60 * 60 * 48),
        timestamp: chatActivities['withdrawal-bot']?.timestamp || Date.now() - 1000 * 60 * 60 * 48,
        isMe: false,
        avatarUrl: WITHDRAWAL_BOT_AVATAR,
        avatarLabel: 'W',
        avatarColor: '#2481cc',
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src={WITHDRAWAL_BOT_AVATAR}
              alt="+44 7721452217"
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: () => navigate('/carteira')
      },

      {
        id: 'business-bot-manager',
        folder: 'bots' as ChatFolder,
        name: 'X-father',
        isVerified: true,
        tag: null,
        lastMessage: 'Gestão de bots do Teggram-X',
        senderPrefix: null,
        time: formatTelegramTime(chatActivities['business-bot-manager']?.timestamp || Date.now() - 1000 * 60 * 60 * 72),
        timestamp: chatActivities['business-bot-manager']?.timestamp || Date.now() - 1000 * 60 * 60 * 72,
        isMe: false,
        avatarUrl: '/logo_tegx.jfif',
        avatarLabel: 'B',
        avatarColor: '#2481cc',
        isSubordinate: false,
        nivel: null,
        actionBtn: (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate('/botfather'); }}
            className="shrink-0 px-3.5 py-1 rounded-full bg-[#2481cc] text-white text-[13px] font-medium leading-none cursor-pointer hover:bg-[#1e6eb0] active:bg-[#1a5e9a] transition-colors"
          >
            Abrir
          </button>
        ),
        avatar: (
          <div className="w-[52px] h-[52px] rounded-full overflow-hidden border border-gray-200/80 bg-white flex-shrink-0">
            <img src="/logo_tegx.jfif" alt="Teggram-X" className="w-full h-full object-cover" />
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
        const nv = c.nivel;
        const ts = c.lastMessageTimestamp ? Number(c.lastMessageTimestamp) : Date.now();

        return {
          id: `contact-${c.id}`,
          contactId: c.id,
          folder: 'all' as ChatFolder,
          name: c.nome_exibicao || formatSenderPhone(c.telefone, c.countryCode),
          isVerified: isVerifiedManagerPhone(c.telefone, c.countryCode),
          tag: null,
          nivel: nv,
          lastMessage: c.lastMessage,
          senderPrefix: null,
          time: formatTelegramTime(ts),
          timestamp: ts,
          isMe: c.isMe,
          avatarUrl: getProfileAvatarUrl(c) || null,
          avatarLabel: label,
          avatarColor: color,
          actionBtn: null,
          avatar: (
            <div className="relative shrink-0">
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt=""
                  className="h-[52px] w-[52px] rounded-full object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
                  }}
                />
              ) : (
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </div>
              )}
            </div>
          ),
          onClick: () => navigate(`/chat/${c.id}?t=${encodeURIComponent(c.telefone)}${nv ? `&nv=${nv}` : ''}`)
        };
      });

    // 3. Combina e ordena estritamente por timestamp decrescente (a conversa mais recente sempre em 1º lugar!)
    const knownContactIds = new Set(activeContactChats.map((chat) => String(chat.contactId)));
    const searchedContactChats = Object.entries(messageSearchHits)
      .filter(([contactId]) => contactId !== 'community-chat' && !knownContactIds.has(contactId))
      .map(([contactId, hit]) => {
        const contact = contacts.find((item) => String(item.id) === contactId) || messageSearchProfiles[contactId];
        if (!contact) return null;
        const phone = contact.telefone || '';
        const color = getUserColor(phone || contactId);
        const label = phone.replace(/\D/g, '').slice(-2) || '?';
        const nivel = contact.nivel;
        const name = contact.nome_exibicao || formatSenderPhone(phone, contact.countryCode);
        const avatarUrl = getProfileAvatarUrl(contact)         || null;

  useEffect(() => {
        const userId = user?.id;
        setChatActivities(loadChatActivities(userId));
        if (!userId) return;

        const handleChatActivity = (event: Event) => {
          const detail = (event as CustomEvent<{
            userId: string;
            chatId: string;
            activity: ChatActivity;
          }>).detail;
          if (detail?.userId !== userId) return;
          setChatActivities((previous) => ({ ...previous, [detail.chatId]: detail.activity }));
        };
        const handleStorage = (event: StorageEvent) => {
          if (event.key === `bm_chat_activity_${userId}`) {
            setChatActivities(loadChatActivities(userId));
          }
        };

        window.addEventListener(CHAT_ACTIVITY_EVENT, handleChatActivity);
        window.addEventListener('storage', handleStorage);
        return () => {
          window.removeEventListener(CHAT_ACTIVITY_EVENT, handleChatActivity);
          window.removeEventListener('storage', handleStorage);
        };
  }, [user?.id]);

        return {
          id: `contact-${contactId}`,
          contactId,
          folder: 'all' as ChatFolder,
          name,
          isVerified: isVerifiedManagerPhone(phone, contact.countryCode),
          tag: null,
          nivel,
          lastMessage: hit.text,
          senderPrefix: null,
          time: formatTelegramTime(hit.timestamp),
          timestamp: hit.timestamp,
          isMe: false,
          avatarUrl,
          avatarLabel: label,
          avatarColor: color,
          actionBtn: null,
          avatar: avatarUrl ? (
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt=""
                className="h-[52px] w-[52px] rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
                }}
              />
            </div>
          ) : (
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
              style={{ backgroundColor: color }}
            >
              {label}
            </div>
          ),
          onClick: () => navigate(`/chat/${contactId}?t=${encodeURIComponent(phone)}${nivel ? `&nv=${nivel}` : ''}`)
        };
      })
      .filter((chat): chat is NonNullable<typeof chat> => chat !== null);

    return [...systemChats, ...activeContactChats, ...searchedContactChats].sort((a, b) => b.timestamp - a.timestamp);
  }, [chatActivities, communityLastMessage, contacts, messageSearchHits, messageSearchProfiles, navigate]);

  const filteredChats = useMemo(() => {
    let list = allConversations;

    if (!queryClean) {
      if (activeFilter === 'groups') {
        list = list.filter(c => c.folder === 'groups');
      } else if (activeFilter === 'bots') {
        list = list.filter(c => c.folder === 'bots');
      } else if (activeFilter === 'unread') {
        list = list.filter(c => 'contactId' in c && c.contactId && unreadContactIds.has(String(c.contactId)));
      }
    }

    if (queryClean) {
      list = list.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(queryClean);
        const msgMatch = (c.lastMessage || '').toLowerCase().includes(queryClean);
        const contactId = 'contactId' in c && c.contactId ? String(c.contactId) : c.id;
        return nameMatch || msgMatch || Boolean(messageSearchHits[contactId]);
      });
    }

    return list;
  }, [allConversations, activeFilter, messageSearchHits, queryClean, unreadContactIds]);

  const idleContacts = useMemo(() => {
    if (activeFilter !== 'all' || queryClean) return [];
    return filteredContacts.filter(c => !c.lastMessage);
  }, [filteredContacts, activeFilter, queryClean]);

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
                type="button"
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer shrink-0"
                title={t('chat.back')}
                aria-label={t('chat.back')}
              >
                <X className="w-5 h-5 text-[#111] dark:text-white" aria-hidden="true" />
              </button>

              <div className="flex-1 flex items-center bg-[#f1f1f1] dark:bg-[#1c2733] rounded-full px-3.5 py-1.5 mx-1">
                {isMessageSearchLoading ? (
                  <Loader2 className="w-4 h-4 text-[#707579] dark:text-[#9eaab6] mr-2 shrink-0 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-[#707579] dark:text-[#9eaab6] mr-2 shrink-0" />
                )}
                <input
                  type="text"
                  autoFocus
                  aria-label={t('chat.search')}
                  placeholder={t('chat.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#111] dark:text-white placeholder:text-[#707579] outline-none border-none"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-[#aaa] hover:bg-[#999] text-white cursor-pointer"
                    aria-label={t('chat.clear_search')}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-w-0 flex-1 items-center pl-2">
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
                    aria-label={t('chat.open_menu')}
                    aria-expanded={isNavigationDrawerOpen}
                  >
                    <Menu className="h-[20px] w-[20px]" />
                  </button>
                  <h1 className="min-w-0 truncate whitespace-nowrap text-[22px] font-semibold tracking-tight text-[#2481cc] dark:text-[#6ab3f3]">
                    <button type="button" onClick={() => window.location.reload()}>
                      Teggram-X
                    </button>
                  </h1>
                </>
              )}
            </div>
          )}

          {/* Ações da Direita */}
          <div className="flex items-center gap-0">
            {!isSearching && (
              <button
                type="button"
                onClick={() => setIsSearching(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                title={t('chat.search')}
                aria-label={t('chat.search')}
              >
                <Search className="w-5 h-5 text-[#111] dark:text-white" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (outletContext?.openAutoMessages) {
                  outletContext.openAutoMessages();
                } else {
                  navigate('/perfil');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              title={t('chat.automatic_messages')}
              aria-label={t('chat.automatic_messages')}
            >
              <MoreVertical className="w-5 h-5 text-[#111] dark:text-white" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isNavigationDrawerOpen && (
          <div className="fixed inset-x-0 top-0 bottom-14 z-[100] md:inset-0" role="presentation">
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default bg-black/40"
              onClick={() => setIsNavigationDrawerOpen(false)}
              aria-label={t('chat.close_menu')}
            />
            <nav
              className="absolute inset-y-0 left-0 flex w-[280px] flex-col overflow-y-auto overscroll-contain bg-white pb-4 shadow-xl dark:bg-[#17212b] md:pb-4"
              aria-label={t('chat.main_navigation')}
            >
              <div className="border-b border-gray-100 bg-[#2481cc] px-4 pb-3 pt-5 text-white dark:border-[#202b36] dark:bg-[#1c242f]">
                <div className="mb-3 flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavigationDrawerOpen(false);
                      navigate("/perfil");
                    }}
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[22px] font-semibold"
                    aria-label={t('chat.edit_profile')}
                  >
                    {drawerAvatar ? (
                      <img
                        src={drawerAvatar}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
                        }}
                      />
                    ) : (
                      drawerName.trim().charAt(0).toUpperCase()
                    )}
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={darkMode}
                    aria-label={darkMode ? t('theme.dark') : t('theme.light')}
                    title={darkMode ? t('theme.dark') : t('theme.light')}
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {darkMode
                      ? <Moon className="h-5 w-5" aria-hidden="true" />
                      : <Sun className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    navigate("/perfil");
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 text-left"
                  aria-label={t('chat.edit_profile')}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{drawerName}</p>
                    <p className="mt-0.5 truncate text-[14px] text-white/80">
                      {drawerPhone ? formatDrawerPhone(drawerPhone) : t('chat.phone_missing')}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/80" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNavigationDrawerOpen(false);
                  setIsZoomSettingsOpen(true);
                }}
                className="flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[16px] text-[#222] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
              >
                <ZoomIn className="h-5 w-5 text-[#707579] dark:text-[#9eaab6]" aria-hidden="true" />
                {t('zoom.title')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNavigationDrawerOpen(false);
                  setIsThemeSettingsOpen(true);
                }}
                className="flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[16px] text-[#222] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
              >
                <Palette className="h-5 w-5 text-[#707579] dark:text-[#9eaab6]" aria-hidden="true" />
                {t('theme.title')}
              </button>
              {[
                { label: t('chat.wallet'), path: "/carteira", icon: Wallet },
                { label: t('chat.payment_wallet'), path: "/sand-pay", icon: PlusCircle },
                { label: t('chat.bank_wallet'), path: "/carteira?intent=add-bank", icon: CreditCard },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    navigate(path);
                  }}
                  className="flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[16px] text-[#222] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
                >
                  <Icon className="h-5 w-5 text-[#707579] dark:text-[#9eaab6]" />
                  {label}
                </button>
              ))}
              <div className="my-2 shrink-0 border-t border-gray-100 dark:border-[#202b36]" />
              {[
                { label: t('invite.title'), path: "/contactos", icon: UserRoundPlus },
                { label: t('chat.download_apk'), path: "/android?setln=pt", icon: Download },
                { label: t('settings.language'), path: "/definicoes", icon: Globe, state: { openLanguage: true } },
                { label: t('chat.reset_password'), path: "/alterar-senha", icon: ShieldAlert },
                { label: t('chat.terms_privacy'), path: "/privacidade", icon: Smartphone },
                { label: t('chat.settings'), path: "/definicoes", icon: Settings },
              ].map(({ label, path, icon: Icon, state }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setIsNavigationDrawerOpen(false);
                    navigate(path, state ? { state } : undefined);
                  }}
                  className={`${label === t('invite.title') ? 'mt-1' : ''} flex h-12 shrink-0 items-center gap-4 px-5 text-left text-[16px] text-[#222] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5`}
                >
                  <Icon className="h-5 w-5 text-[#707579] dark:text-[#9eaab6]" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        )}
        {isZoomSettingsOpen && (
          <ZoomSettingsModal onClose={() => setIsZoomSettingsOpen(false)} />
        )}
        {isThemeSettingsOpen && (
          <ThemeSettingsScreen onClose={() => setIsThemeSettingsOpen(false)} />
        )}

        {/* ── ABAS SUPERIORES ── */}
        <div className="flex overflow-x-auto no-scrollbar px-2 bg-white dark:bg-[#242f3d] border-t border-[#e8e8e8] dark:border-white/10">
          {folders.map(folder => {
            const isActive = activeFilter === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                aria-pressed={isActive}
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
      <main className={`w-full flex-1 overflow-y-auto pt-[6px] ${embedded ? "pb-2" : "pb-20"}`}>
        {isLoading && contacts.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 text-[13px] text-[#707579] dark:text-[#9eaab6]">
            <Loader2 className="h-4 w-4 animate-spin text-[#2481cc]" />
            <span>{t('chat.loading_chats')}</span>
          </div>
        )}
        <>
          {/* 1. Lista de conversas ativas ordenadas por recência */}
          {filteredChats.map((chat) => {
              const rawId = chat.id.startsWith('contact-') ? chat.id.replace('contact-', '') : null;
              const isOnline = rawId
                ? isUserOnline(rawId)
                : chat.id === 'deposit-bot' || chat.id === 'withdrawal-bot';
              const chatContactId = 'contactId' in chat && chat.contactId ? String(chat.contactId) : chat.id;
              const matchedMessage = messageSearchHits[chatContactId];

              return (
                <div
                  key={chat.id}
                  className="relative flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
                >
                  <button
                    type="button"
                    onClick={chat.onClick}
                    className="absolute inset-0 z-0 rounded-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc] focus-visible:outline-offset-[-2px]"
                    aria-label={chat.name}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setAvatarPreview({
                        src: chat.avatarUrl || null,
                        name: chat.name,
                        label: chat.avatarLabel,
                        color: chat.avatarColor,
                      });
                    }}
                    className="relative z-10 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc]"
                    aria-label={`Ver avatar de ${chat.name}`}
                  >
                    {chat.avatar}
                    {isOnline && (
                      <span
                        className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-[#10b981] dark:border-[#17212b]"
                        title={t('chat.online_now')}
                      />
                    )}
                  </button>

                  <div className="relative z-10 flex-1 min-w-0 py-0.5 pointer-events-none">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[15.5px] font-medium text-[#111] dark:text-white truncate leading-tight">
                          {chat.name}
                        </h3>
                        {chat.isVerified && <VerifiedBadge className="ml-1 h-[16px] w-[16px]" />}
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
                              <span className="text-[#4dcd5e] font-medium italic">{communityTypingUser} {t('chat.typing')}</span>
                            ) : isTyping ? (
                              <span className="text-[#4dcd5e] font-medium italic">{t('chat.typing')}</span>
                            ) : (
                              <span className="text-[#707579] dark:text-[#9eaab6]">
                                {chat.senderPrefix && (
                                  <span className="text-[#2481cc] font-medium">{chat.senderPrefix}</span>
                                )}
                                {previewText(matchedMessage?.text || chat.lastMessage || '')}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                      {chat.actionBtn && (
                        <div className="pointer-events-auto">
                          {chat.actionBtn}
                        </div>
                      )}
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
                    {t('chat.contacts_in_app')}
                  </span>
                </div>

                {idleContacts.map((contact) => {
                  const color = getUserColor(contact.telefone);
                  const label = (contact.telefone || '').replace(/\D/g, '').slice(-2) || '?';
                  const nv = contact.nivel;
                  const isOnline = isUserOnline(contact.id);

                  return (
                    <div
                      key={contact.id}
                      className="relative flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/chat/${contact.id}?t=${encodeURIComponent(contact.telefone)}${nv ? `&nv=${nv}` : ''}`)}
                        className="absolute inset-0 z-0 rounded-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc] focus-visible:outline-offset-[-2px]"
                        aria-label={contact.nome_exibicao || formatSenderPhone(contact.telefone, contact.countryCode)}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAvatarPreview({
                            src: getProfileAvatarUrl(contact) || null,
                            name: contact.nome_exibicao || formatSenderPhone(contact.telefone, contact.countryCode),
                            label,
                            color,
                          });
                        }}
                        className="relative z-10 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc]"
                        aria-label={`Ver avatar de ${contact.nome_exibicao || formatSenderPhone(contact.telefone, contact.countryCode)}`}
                      >
                        {contact.avatarUrl ? (
                          <img
                            src={contact.avatarUrl}
                            alt=""
                            className="h-[52px] w-[52px] rounded-full object-cover"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
                            }}
                          />
                        ) : (
                          <div
                            className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
                            style={{ backgroundColor: color }}
                          >
                            {label}
                          </div>
                        )}

                        {isOnline && (
                          <span
                            className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-[#10b981] dark:border-[#17212b]"
                            title={t('chat.online_now')}
                          />
                        )}
                      </button>

                      <div className="relative z-10 flex-1 min-w-0 py-0.5 pointer-events-none">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <h3 className="text-[15px] font-medium text-[#111] dark:text-white truncate leading-tight">
                              {contact.nome_exibicao || formatSenderPhone(contact.telefone, contact.countryCode)}
                            </h3>
                          </div>
                        </div>

                        <p className="text-[13px] leading-snug mt-[1px] truncate">
                          {typingUsers[contact.id] ? (
                            <span className="text-[#4dcd5e] font-medium italic">{t('chat.typing')}</span>
                          ) : (
                            <span className="text-[#707579] dark:text-[#9eaab6]">
                              {t('chat.seen_at').replace('{time}', timeStr)}
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
            {searchQuery && !isMessageSearchLoading && filteredChats.length === 0 && idleContacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-[#707579] dark:text-[#9eaab6] text-[15px] mb-2">
                  {t('chat.no_search_results').split('{query}')[0]}
                  <strong>{searchQuery}</strong>
                  {t('chat.no_search_results').split('{query}')[1]}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[#2481cc] text-[14px] font-semibold cursor-pointer"
                >
                  {t('chat.clear_search')}
                </button>
              </div>
            )}
        </>
      </main>

      {!embedded && (
        <>
          {/* ── BOTÃO DE NOVA CONVERSA ── */}
          <button
            type="button"
            onClick={() => {
              showToast(t('chat.new_conversation'), 'info');
              navigate('/web');
            }}
            className="fixed bottom-[74px] right-4 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] text-white shadow-[0_4px_16px_rgba(36,129,204,0.45)] transition-all hover:scale-105 active:scale-95"
            title={t('chat.new_conversation')}
            aria-label={t('chat.new_conversation')}
          >
            <Plus className="h-6 w-6 stroke-[2.2]" />
          </button>
        </>
      )}
      {avatarPreview && (
        <button
          type="button"
          onClick={() => setAvatarPreview(null)}
          className="fixed inset-0 z-[200] flex cursor-zoom-out items-center justify-center bg-black/90 p-5"
          aria-label={`Fechar avatar de ${avatarPreview.name}`}
        >
          {avatarPreview.src ? (
            <img
              src={avatarPreview.src}
              alt={avatarPreview.name}
              className="h-[min(88vw,80vh)] w-[min(88vw,80vh)] max-h-full max-w-full rounded-full object-contain shadow-2xl"
              onError={() => setAvatarPreview((current) => current ? { ...current, src: DEFAULT_PROFILE_AVATAR } : null)}
            />
          ) : (
            <span
              className="flex h-[min(80vw,360px)] w-[min(80vw,360px)] items-center justify-center rounded-full text-8xl font-semibold text-white shadow-2xl"
              style={{ backgroundColor: avatarPreview.color }}
              aria-hidden="true"
            >
              {avatarPreview.label}
            </span>
          )}
        </button>
      )}
      </div>
    </div>
  );
}
