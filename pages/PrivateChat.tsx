import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { 
  ChevronLeft, 
  Send, 
  Clock,
  CheckCheck, 
  Loader2, 
  Phone, 
  MoreVertical, 
  Paperclip, 
  Camera,
  Smile, 
  Mic,
  Zap,
  Reply,
  Copy,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Calendar,
  FileText
} from 'lucide-react';
import { useToast } from '../components/Toast';
import PdfDownloadCard, { formatFileSize } from '../components/PdfDownloadCard';
import { VoiceMessageComposer, VoiceMessagePlayer, type VoiceMessageComposerHandle } from '../components/VoiceMessage';
import { deleteVoiceMessage, uploadVoiceMessage } from '../lib/voiceMessages';
import AutoTranslatedText from '../components/AutoTranslatedText';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import ChatsList from './ChatsList';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { useLanguage } from '../contexts/LanguageContext';

// â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Message {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  status?: 'sending' | 'sent' | 'failed';
  reaction?: string;
  detalhes?: {
    imagem_url?: string;
    tipo_midia?: string;
    [key: string]: any;
  };
}

interface VoiceAttachment {
  audioPath: string;
  durationSeconds: number;
}

interface ContextMenu {
  message: Message;
  x: number;
  y: number;
  isMe: boolean;
}

// â”€â”€ Constantes de Emojis Oficiais Telegram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const QUICK_REACTIONS = ['ðŸ‘', 'â¤ï¸', 'ðŸ”¥', 'ðŸ¥°', 'ðŸ‘', 'ðŸ˜‚'];

const getMessageDetails = (details: Message['detalhes'] | string | null | undefined) => {
  if (typeof details === 'string') {
    try {
      const parsed: unknown = JSON.parse(details);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as NonNullable<Message['detalhes']>
        : {};
    } catch {
      return {};
    }
  }

  return details && typeof details === 'object' ? details : {};
};

// â”€â”€ Componente Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function PrivateChat() {
  const { contactId } = useParams();
  const [searchParams] = useSearchParams();
  const { language, t, translateFullChats } = useLanguage();
  const rawContactPhone = searchParams.get('t') || t('chat.contact');
  const contactLevel = searchParams.get('nv');
  
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();
  const { isUserOnline } = usePresence();
  const { statusText } = useNetworkStatus();
  const contactIsOnline = isUserOnline(contactId);

  const [contactDisplayName, setContactDisplayName] = useState(rawContactPhone);
  const localKey = user && contactId ? `private_chat_${user.id}_${contactId}` : null;

  const [messages, setMessages] = useState<Message[]>(() => {
    if (localKey) {
      try {
        const cached = localStorage.getItem(localKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            return Array.isArray(parsed)
              ? parsed.filter((message: Message) =>
                typeof message.id === 'string' &&
                message.id.startsWith('local_') &&
                (message.status === 'sending' || message.status === 'failed')
              )
              : [];
          }
          return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [voiceComposerActive, setVoiceComposerActive] = useState(false);
  const voiceComposerRef = useRef<VoiceMessageComposerHandle>(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) return true;
    if (localKey) {
      try {
        const cached = localStorage.getItem(localKey);
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [contactProfile, setContactProfile] = useState<any>({
    name: contactDisplayName || rawContactPhone || t('chat.contact'),
    phone: rawContactPhone || t('common.not_informed'),
    avatarUrl: '',
    hierarchy: contactLevel || 'L1',
    invitedAt: null,
    registeredAt: null,
  });

  // â”€â”€ Indicador de Digitando em Tempo Real (Supabase Broadcast) â”€â”€
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);
  const typingChannelRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ name: string; url: string; sizeBytes: number } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      showToast(t('chat.image_invalid'), 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('chat.image_too_large'), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result !== 'string') {
        showToast(t('chat.image_open_failed'), 'error');
        return;
      }
      setImagePreview(ev.target.result);
      setPdfPreview(null);
    };
    reader.onerror = () => showToast(t('chat.image_open_failed'), 'error');
    reader.readAsDataURL(file);
  };

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast(t('chat.pdf_invalid_type'), 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('chat.pdf_too_large'), 'error');
      return;
    }

    try {
      const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (new TextDecoder().decode(signature) !== '%PDF-') {
        showToast(t('chat.pdf_invalid'), 'error');
        return;
      }
    } catch {
      showToast(t('chat.pdf_validation_failed'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        showToast(t('chat.pdf_open_failed'), 'error');
        return;
      }
      setPdfPreview({ name: file.name, url: reader.result, sizeBytes: file.size });
      setImagePreview(null);
    };
    reader.onerror = () => showToast(t('chat.pdf_open_failed'), 'error');
    reader.readAsDataURL(file);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        if (behavior === 'auto') {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
      }
    });
  };

  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // â”€â”€ Fetch Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isFetchingRef = useRef(false);
  const fetchMessages = async (isInitial = false) => {
    if (!user || !contactId) return;
    if (!isUUID(contactId)) {
      if (localKey) {
        try {
          const cached = localStorage.getItem(localKey);
          if (cached) setMessages(JSON.parse(cached));
        } catch {}
      }
      if (isInitial) setIsLoading(false);
      return;
    }
    if (isFetchingRef.current && !isInitial) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await (supabase as any)
        .from('sys_t110')
        .select('*')
        .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${contactId}),and(remetente_id.eq.${contactId},destinatario_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(150);

      if (error) throw error;

      const serverMessages = data || [];
      const unreadIncomingMessages = serverMessages.filter((message: Message) =>
        message.remetente_id === contactId &&
        message.destinatario_id === user.id &&
        (message.lida === false || getMessageDetails(message.detalhes).lida === false)
      );
      const readMessageIds = new Set<string>();

      await Promise.all(unreadIncomingMessages.map(async (message: Message) => {
        const details = getMessageDetails(message.detalhes);
        const { error: readError } = await (supabase as any)
          .from('sys_t110')
          .update({ detalhes: { ...details, lida: true } })
          .eq('id', message.id)
          .eq('destinatario_id', user.id);

        if (readError) {
          console.error(`NÃ£o foi possÃ­vel marcar a mensagem ${message.id} como lida:`, readError);
          return;
        }
        readMessageIds.add(message.id);
      }));

      const messagesWithReadState = serverMessages.map((message: Message) => {
        if (!readMessageIds.has(message.id)) return message;
        return {
          ...message,
          lida: true,
          detalhes: { ...getMessageDetails(message.detalhes), lida: true },
        };
      });

      setMessages(prev => {
        const pendingLocal = prev.filter(m =>
          typeof m.id === 'string' &&
          m.id.startsWith('local_') &&
          (m.status === 'sending' || m.status === 'failed') &&
          !messagesWithReadState.some((serverMessage: any) =>
            serverMessage.remetente_id === m.remetente_id &&
            serverMessage.mensagem === m.mensagem
          )
        );
        const refreshed = [...messagesWithReadState, ...pendingLocal].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        if (localKey) {
          try {
            if (refreshed.length > 0) {
              localStorage.setItem(localKey, JSON.stringify(refreshed));
            } else {
              localStorage.removeItem(localKey);
            }
          } catch {}
        }

        return refreshed;
      });
      if (isInitial) scrollToBottom('auto');
    } catch (error) {
      console.error('NÃ£o foi possÃ­vel sincronizar as mensagens privadas:', error);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.onLine && localKey && isUUID(contactId || '')) {
      setMessages(prev => {
        const pendingLocal = prev.filter(m =>
          typeof m.id === 'string' &&
          m.id.startsWith('local_') &&
          (m.status === 'sending' || m.status === 'failed')
        );
        try {
          if (pendingLocal.length > 0) {
            localStorage.setItem(localKey, JSON.stringify(pendingLocal));
          } else {
            localStorage.removeItem(localKey);
          }
        } catch {}
        return pendingLocal;
      });
    }

    fetchMessages(true);
    
    // Configura o Realtime para atualizar as mensagens sem polling constante (DDoS no banco)
    const chatChannel = supabase.channel(`sys_t110_sync_${user?.id}_${contactId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110', filter: `destinatario_id=eq.${user?.id}` }, () => {
        fetchMessages(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110', filter: `remetente_id=eq.${user?.id}` }, () => {
        fetchMessages(false);
      })
      .subscribe();

    const handleSync = () => {
      if (!navigator.onLine) return;
      setIsLoading(true);
      setMessages(prev => {
        const pendingLocal = prev.filter(m =>
          typeof m.id === 'string' &&
          m.id.startsWith('local_') &&
          (m.status === 'sending' || m.status === 'failed')
        );
        if (localKey) {
          try {
            if (pendingLocal.length > 0) {
              localStorage.setItem(localKey, JSON.stringify(pendingLocal));
            } else {
              localStorage.removeItem(localKey);
            }
          } catch {}
        }
        return pendingLocal;
      });
      fetchMessages(false);
    };
    window.addEventListener('online', handleSync);
    window.addEventListener('app:sync-data', handleSync);

    return () => {
      supabase.removeChannel(chatChannel);
      window.removeEventListener('online', handleSync);
      window.removeEventListener('app:sync-data', handleSync);
    };
  }, [user, contactId]);

  // â”€â”€ Escuta e Envio do Status "Digitando..." via Supabase Realtime Broadcast â”€â”€
  useEffect(() => {
    if (!user || !contactId) return;
    const pairId = [user.id, contactId].sort().join('_');
    const channel = supabase.channel(`typing_${pairId}`, {
      config: { broadcast: { ack: false } }
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload?.payload?.userId === contactId) {
          setIsContactTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsContactTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, contactId]);

  const sendTypingBroadcast = () => {
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 1800 && typingChannelRef.current) {
      lastTypingBroadcastRef.current = now;
      // Broadcast no canal da conversa (para o PrivateChat aberto do contato)
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user?.id, targetId: contactId }
      });
      // Broadcast no canal global (para o ChatsList do contato)
      try {
        const globalChannel = supabase.channel('chatslist_typing_global');
        globalChannel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user?.id, targetId: contactId }
        });
      } catch {}
    }
  };

  // Busca telefone do contacto
  useEffect(() => {
    if (!contactId || contactId.startsWith('pavel')) return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('sys_t500')
          .select('*')
          .eq('id', contactId)
          .maybeSingle();

        if (!isMounted || error || !data) return;

        const row = data as any;
        const nextProfile = {
          name: row.nome_exibicao || row.nome || row.display_name || row.telefone || contactDisplayName || rawContactPhone || 'Contato',
          phone: row.telefone || rawContactPhone || 'Não informado',
          avatarUrl: row.avatar_url || row.foto_url || row.photo_url || row.avatar || row.imagem || '',
          hierarchy: row.nivel || row.level || row.hierarquia || row.hierarchy || contactLevel || 'L1',
          invitedAt: row.data_convite || row.invited_at || row.convidado_em || row.invite_date || null,
          registeredAt: row.data_cadastro || row.registered_at || row.criado_em || row.created_at || row.createdAt || null,
        };

        setContactDisplayName(nextProfile.name);
        setContactProfile(nextProfile);
      } catch {}
    })();

    return () => { isMounted = false; };
  }, [contactId, contactDisplayName, rawContactPhone, contactLevel]);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick as any);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick as any);
    };
  }, [contextMenu]);

  // â”€â”€ Context Menu Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openContextMenu = useCallback((message: Message, isMe: boolean) => {
    setShowAllReactions(false);
    setContextMenu({ message, x: 0, y: 0, isMe });
  }, []);

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowAllReactions(false);
  };

  const handleReaction = (emoji: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === contextMenu?.message.id
          ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
          : m
      )
    );
    showToast(t('chat.reaction_added').replace('{emoji}', emoji), 'success');
    closeContextMenu();
  };

  const handleReply = () => {
    if (contextMenu) {
      setReplyTo(contextMenu.message);
      closeContextMenu();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = () => {
    if (contextMenu) {
      navigator.clipboard.writeText(contextMenu.message.mensagem).catch(() => {});
      showToast(t('chat.message_copied'), 'success');
      closeContextMenu();
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      setMessages(prev => prev.filter(m => m.id !== contextMenu.message.id));
      showToast(t('chat.message_deleted'), 'info');
      closeContextMenu();
    }
  };

  // â”€â”€ Long Press Gesture (Pressionar para abrir modal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = (message: Message, isMe: boolean, clientX: number, clientY: number) => {
    isLongPressTriggeredRef.current = false;
    pressStartPosRef.current = { x: clientX, y: clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
        try { window.navigator.vibrate(40); } catch {}
      }
      openContextMenu(message, isMe);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressStartPosRef.current = null;
  };

  const checkMoveCancel = (clientX: number, clientY: number) => {
    if (!pressStartPosRef.current) return;
    const diffX = Math.abs(clientX - pressStartPosRef.current.x);
    const diffY = Math.abs(clientY - pressStartPosRef.current.y);
    if (diffX > 10 || diffY > 10) {
      cancelLongPress();
    }
  };

  // â”€â”€ Send Message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSend = async (overrideText?: string, voiceAttachment?: VoiceAttachment) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if ((!textToSend.trim() && !imagePreview && !pdfPreview && !voiceAttachment) || !user || !contactId || isSending) return;

    const msg = textToSend.trim() || (voiceAttachment ? t('chat.voice_message') : '');
    const imageToSend = imagePreview;
    const pdfToSend = pdfPreview;
    const attachmentDetails = imageToSend
      ? { imagem_url: imageToSend, tipo_midia: 'imagem' }
      : pdfToSend
        ? {
            arquivo_url: pdfToSend.url,
            nome_arquivo: pdfToSend.name,
            tamanho_bytes: pdfToSend.sizeBytes,
            tipo_mime: 'application/pdf',
            tipo_midia: 'documento'
          }
        : voiceAttachment
          ? {
              audio_path: voiceAttachment.audioPath,
              audio_duration_seconds: voiceAttachment.durationSeconds,
              tipo_midia: 'audio'
            }
          : undefined;

    setInputText('');
    setImagePreview(null);
    setPdfPreview(null);
    setReplyTo(null);
    setIsComposerExpanded(false);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.overflowY = 'hidden';
    }

    const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: tempId,
      remetente_id: user.id,
      destinatario_id: contactId,
      mensagem: msg,
      lida: false,
      created_at: new Date().toISOString(),
      detalhes: attachmentDetails,
      status: isUUID(contactId) ? 'sending' : 'sent'
    };

    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();

    if (contactId.startsWith('pavel') || contactId.includes('suporte')) {
      setIsContactTyping(true);
      setTimeout(() => {
        setIsContactTyping(false);
        const autoReply: Message = {
          id: `auto_${Date.now()}`,
          remetente_id: contactId,
          destinatario_id: user.id,
          mensagem: 'Obrigado pela sua mensagem! O Business Messenger estÃ¡ ativo para impulsionar suas operaÃ§Ãµes e conexÃµes em tempo real. Se precisar de assistÃªncia financeira com Stars, consulte a aba de Carteira.',
          lida: true,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, autoReply]);
        scrollToBottom();
      }, 900);
    }

    if (!isUUID(contactId)) {
      if (localKey) {
        try {
          const current = [...messages, newMsg];
          localStorage.setItem(localKey, JSON.stringify(current));
        } catch {}
      }
      return;
    }

    try {
      const payload = {
        remetente_id: user.id,
        destinatario_id: contactId,
        mensagem: msg,
        detalhes: {
          lida: false,
          ...(attachmentDetails || {})
        }
      };
      console.log('[PrivateChat] Enviando para sys_t110:', payload);
      const { data: inserted, error } = await (supabase as any)
        .from('sys_t110')
        .insert([payload])
        .select()
        .single();
      if (error) {
        throw error;
      }
      if (!inserted) {
        throw new Error('A persistÃªncia nÃ£o confirmou a mensagem.');
      }
      setMessages(prev => {
        const updated = prev.map(m => m.id === tempId ? { ...inserted, status: 'sent' } : m);
        if (localKey) {
          try {
            localStorage.setItem(localKey, JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
      console.log('[PrivateChat] Mensagem inserida com sucesso');
    } catch (err: unknown) {
      console.error('[PrivateChat] Falha ao persistir mensagem:', err);
      if (voiceAttachment) {
        setMessages(prev => {
          const updated = prev.filter(message => message.id !== tempId);
          if (localKey) {
            try {
              localStorage.setItem(localKey, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
        try {
          await deleteVoiceMessage(voiceAttachment.audioPath);
        } catch (cleanupError) {
          console.error('[PrivateChat] Could not remove an unsent voice message:', cleanupError);
        }
        throw err;
      }
      setMessages(prev => {
        const updated = prev.map(m => m.id === tempId ? { ...m, status: 'failed' as const } : m);
        if (localKey) {
          try {
            localStorage.setItem(localKey, JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
      showToast(t('chat.message_not_sent'), 'error');
    }
  };

  const handleSendVoiceMessage = async (blob: Blob, durationSeconds: number) => {
    if (!user || !contactId || !isUUID(contactId)) {
      throw new Error('Voice messages require a registered private conversation.');
    }

    try {
      const audioPath = await uploadVoiceMessage(blob, user.id, {
        type: 'private',
        recipientId: contactId
      });
      await handleSend(undefined, { audioPath, durationSeconds });
    } catch (error) {
      console.error('[PrivateChat] Could not upload voice message:', error);
      throw error;
    }
  };

  // â”€â”€ Helpers de FormataÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const formatTime = (ts: string) =>
    ts ? new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';

  const formatDateLabel = (dStr: string) => {
    if (!dStr) return "Hoje";
    const d = new Date(dStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long" });
  };

  const formatPhoneClean = (val: string) => {
    const rawPhone = val?.trim();
    if (!rawPhone) return 'Contacto';

    const digits = rawPhone.replace(/\D/g, '');
    const internationalPhone = rawPhone.startsWith('+')
      ? rawPhone
      : /^00/.test(rawPhone)
        ? `+${rawPhone.slice(2).replace(/\D/g, '')}`
        : `+${digits}`;
    const parsed = parsePhoneNumberFromString(internationalPhone);
    return parsed ? parsed.formatInternational() : rawPhone;
  };

  const formatProfileDate = (value: string | null | undefined) => {
    if (!value) return 'NÃ£o informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'NÃ£o informado';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getHierarchyLabel = (value: any) => {
    const normalized = String(value ?? contactLevel ?? 'L1').trim().toUpperCase();
    if (/^L[123]$/.test(normalized)) return normalized;
    if (/^[123]$/.test(normalized)) return `L${normalized}`;
    if (/NIVEL\s*1|NÃVEL\s*1/.test(normalized)) return 'L1';
    if (/NIVEL\s*2|NÃVEL\s*2/.test(normalized)) return 'L2';
    if (/NIVEL\s*3|NÃVEL\s*3/.test(normalized)) return 'L3';
    return 'L1';
  };

  const getUserColor = (str: string) => {
    const colors = ['#229ED9', '#E56555', '#8E44AD', '#27AE60', '#D35400', '#16A085', '#C0392B', '#2980B9'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const contactColor = getUserColor(contactDisplayName);
  const isCommunityChat = contactId?.startsWith('pavel');

  // â”€â”€ AÃ§Ãµes do menu de contexto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const menuActions = contextMenu ? [
    { icon: Reply, label: t('common.reply'), onClick: handleReply, color: '#2481cc' },
    { icon: Copy, label: t('common.copy'), onClick: handleCopy, color: '#555' },
    ...(contextMenu.isMe ? [{ icon: Pencil, label: t('common.edit'), onClick: () => { showToast(t('chat.edit_coming_soon'), 'info'); closeContextMenu(); }, color: '#555' }] : []),
    { icon: Trash2, label: t('common.delete'), onClick: handleDelete, color: '#e53e3e', subLabel: t('chat.auto_delete_31_days') },
  ] : [];

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#f4f4f5] dark:bg-[#0e1621]">
      <aside className="hidden h-full w-[350px] shrink-0 border-r border-gray-200 dark:border-[#202b36] md:block">
        <ChatsList embedded />
      </aside>
      <div 
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col font-sans antialiased text-[#202020] select-none tg-chat-no-select overflow-hidden tg-wallpaper transition-colors"
      onContextMenu={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >

      {/* â”€â”€ HEADER â”€â”€ */}
      <div className="h-[68px] shrink-0 md:hidden" aria-hidden="true" />
      <header className="fixed left-0 right-0 top-0 z-40 flex w-full shrink-0 select-none items-center justify-between bg-transparent px-3 py-3 pointer-events-none sm:px-4 md:sticky md:left-auto md:right-auto md:top-0">
        <button
          onClick={() => navigate('/org')}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto md:hidden"
          aria-label={t('chat.back')}
        >
          <ChevronLeft className="w-6 h-6 stroke-[2]" />
        </button>

        <div className="flex w-0 flex-1 items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 pointer-events-auto">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
            {isCommunityChat ? (
              <img
                src="/logo_bussiness_messeger.jpg"
                alt="Business Messenger"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: contactColor }}
              >
                {contactDisplayName.slice(0, 2).toUpperCase() || '?'}
              </div>
            )}
            {contactIsOnline && !statusText && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-[#1c242f]" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="text-[15px] font-medium text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
                {isCommunityChat ? 'Comunidade Business Messenger' : formatPhoneClean(contactDisplayName)}
              </h1>
            </div>
            {statusText ? (
              <span className="text-[12.5px] text-[#2481cc] font-medium leading-[1.15] mt-0.5 truncate flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                {statusText}
              </span>
            ) : isContactTyping ? (
              <span className="text-[12.5px] text-[#2481cc] font-medium leading-[1.15] mt-0.5 truncate flex items-center gap-1">
                {t('chat.typing')}
                <span className="inline-flex items-center gap-[2px]">
                  <span className="w-1 h-1 bg-[#2481cc] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 bg-[#2481cc] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 bg-[#2481cc] rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </span>
            ) : (
              <span className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] font-normal leading-[1.15] mt-0.5 truncate">
                {isCommunityChat ? (
                  'Espaço de partilha da comunidade'
                ) : contactIsOnline ? (
                  <span className="text-[#10b981] font-medium">
                    {t('chat.online_now')}{contactLevel ? ` â€¢ ${t('chat.affiliate_level').replace('{level}', contactLevel.replace(/^L/, ''))}` : ''}
                  </span>
                ) : (
                  t('chat.offline')
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setShowContactProfile(true)}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0"
            aria-label={t('chat.contact_profile')}
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowContactProfile(true)}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0"
            aria-label={t('chat.more_options')}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {showContactProfile && (
        <div
          className="fixed inset-0 z-[250] flex flex-col select-none"
          style={{ backgroundColor: '#efeff4' }}
          onClick={() => setShowContactProfile(false)}
        >
          <div
            className="w-full flex items-center justify-between px-4 pt-3 pb-3 sticky top-0 z-10"
            style={{ backgroundColor: '#efeff4' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowContactProfile(false)}
              className="w-9 h-9 flex items-center justify-center text-[#8e8e93] active:opacity-50 transition-opacity cursor-pointer"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <span className="text-[17px] font-semibold text-[#111] tracking-tight">
              {t('chat.information')}
            </span>
            <div className="w-9 h-9" />
          </div>

          <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center pt-6 pb-5 px-4">
              <div className="relative mb-4 h-[80px] w-[80px] overflow-hidden rounded-full">
                {contactProfile.avatarUrl ? (
                  <img
                    src={contactProfile.avatarUrl}
                    alt={contactProfile.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#2481cc] text-[20px] font-bold text-white">
                    {(contactProfile.name || 'C').slice(0, 2).toUpperCase()}
                  </div>
                )}
                {contactIsOnline && (
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#34c759]" />
                )}
              </div>

              <h1 className="text-center text-[18px] font-bold text-[#111] leading-tight">
                {contactProfile.name || formatPhoneClean(rawContactPhone)}
              </h1>
              <p className="mt-1 text-[13px]" style={{ color: '#8e8e93' }}>
                {contactIsOnline ? t('chat.online_now') : t('chat.offline')}
              </p>
            </div>

            <div className="mx-4 mb-4 overflow-hidden rounded-[12px] bg-white shadow-xs">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: '#007aff' }}>
                  <Phone className="h-[17px] w-[17px] text-white stroke-[2]" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px]" style={{ color: '#007aff' }}>
                    {formatPhoneClean(contactProfile.phone || rawContactPhone)}
                  </span>
                  <span className="text-[12px]" style={{ color: '#8e8e93' }}>{t('chat.phone')}</span>
                </div>
              </div>

              <div className="h-px ml-[56px]" style={{ backgroundColor: '#c8c7cc' }} />

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: '#34c759' }}>
                  <span className="text-[12px] font-bold text-white">L</span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] text-[#111]">
                    {t('chat.affiliate_level').replace('{level}', getHierarchyLabel(contactProfile.hierarchy || contactLevel || 'L1').replace(/^L/, ''))}
                  </span>
                  <span className="text-[12px]" style={{ color: '#8e8e93' }}>{t('chat.hierarchy')}</span>
                </div>
              </div>

              <div className="h-px ml-[56px]" style={{ backgroundColor: '#c8c7cc' }} />

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: '#ff9500' }}>
                  <Calendar className="h-[17px] w-[17px] text-white stroke-[2]" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] text-[#111]">
                    {formatProfileDate(contactProfile.invitedAt)}
                  </span>
                  <span className="text-[12px]" style={{ color: '#8e8e93' }}>{t('chat.invited_at')}</span>
                </div>
              </div>

              <div className="h-px ml-[56px]" style={{ backgroundColor: '#c8c7cc' }} />

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: '#af52de' }}>
                  <CheckCheck className="h-[17px] w-[17px] text-white stroke-[2]" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] text-[#111]">
                    {formatProfileDate(contactProfile.registeredAt)}
                  </span>
                  <span className="text-[12px]" style={{ color: '#8e8e93' }}>{t('chat.registered_at')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ ÃREA DE MENSAGENS TELEGRAM (LARGURA TOTAL FLUIDA) â”€â”€ */}
      <main
        ref={scrollRef}
        className="w-full min-h-0 flex-1 overflow-y-auto no-scrollbar px-3 sm:px-4 md:px-6 pt-2 pb-24 space-y-1.5 relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onClick={() => contextMenu && closeContextMenu()}
      >
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center my-4">
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {messages.map((m, i) => {
          // Primary: remetente_id matches session user
          // Fallback: destinatario_id matches the contact (means I sent it)
          const isMe =
            m.remetente_id === user?.id ||
            (m.destinatario_id === contactId && m.remetente_id !== contactId);
          const showDate = i === 0 || formatDateLabel(m.created_at) !== formatDateLabel(messages[i - 1].created_at);

          return (
            <React.Fragment key={m.id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-[12px] font-medium text-white bg-black/35 backdrop-blur-xs rounded-full px-3.5 py-0.5 shadow-2xs">
                    {formatDateLabel(m.created_at)}
                  </span>
                </div>
              )}

              <div
                className={`flex items-end w-full gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} relative group`}
              >
                  {/* ReaÃ§Ã£o existente */}
                  {m.reaction && (
                    <div
                      className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} z-10 text-[16px] leading-none select-none`}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                    >
                      {m.reaction}
                    </div>
                  )}

                  {/* BalÃ£o da mensagem com Long Press (Pressionar) */}
                  <div
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      startLongPress(m, isMe, t.clientX, t.clientY);
                    }}
                    onTouchMove={(e) => {
                      const t = e.touches[0];
                      checkMoveCancel(t.clientX, t.clientY);
                    }}
                    onTouchEnd={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        startLongPress(m, isMe, e.clientX, e.clientY);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (pressStartPosRef.current) {
                        checkMoveCancel(e.clientX, e.clientY);
                      }
                    }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelLongPress();
                      openContextMenu(m, isMe);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLongPressTriggeredRef.current) {
                        e.preventDefault();
                        isLongPressTriggeredRef.current = false;
                      }
                    }}
                    className={`tg-bubble max-w-[85%] px-[10px] pt-[6px] pb-[6px] text-[#000000] dark:text-[#f3f4f6] shadow-[0_1px_2px_rgba(16,35,47,0.15)] relative cursor-pointer active:brightness-95 active:scale-[0.985] transition-all select-none ${
                      isMe ? 'bg-[#eeffde] dark:bg-[#2b5278] is-me' : 'bg-white dark:bg-[#182533] is-other'
                    } ${contextMenu?.message.id === m.id ? 'brightness-90 scale-[0.985]' : ''}`}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Ponta de agulha discreta (Tail) */}
                    {isMe ? (
                      <svg
                        width="9"
                        height="20"
                        viewBox="0 0 9 20"
                        className="absolute pointer-events-none"
                        style={{ bottom: 0, right: -8, fill: 'currentColor' }}
                        stroke="none"
                        color="inherit"
                      >
                        <path d="M0 20H9C4.5 20 1 16 0 8V20Z" className="fill-[#eeffde] dark:fill-[#2b5278]" />
                      </svg>
                    ) : (
                      <svg
                        width="9"
                        height="20"
                        viewBox="0 0 9 20"
                        className="absolute pointer-events-none"
                        style={{ bottom: 0, left: -8, transform: 'scaleX(-1)', fill: 'currentColor' }}
                      >
                        <path d="M0 20H9C4.5 20 1 16 0 8V20Z" className="fill-white dark:fill-[#182533]" />
                      </svg>
                    )}

                    {/* Imagem anexada */}
                    {m.detalhes?.imagem_url && (
                      <div className="mb-1 rounded-[14px] overflow-hidden pointer-events-auto">
                        <img
                          src={m.detalhes.imagem_url}
                          alt="Foto"
                          className="w-full max-h-[320px] object-cover rounded-[14px] cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage(m.detalhes?.imagem_url || null);
                          }}
                        />
                      </div>
                    )}

                    {m.detalhes?.audio_path && (
                      <>
                        {!isMe && (
                          <p
                            className="mb-1 truncate text-[13px] font-medium"
                            style={{ color: isCommunityChat ? '#2481cc' : contactColor }}
                          >
                            {isCommunityChat ? 'Comunidade Business Messenger' : formatPhoneClean(contactDisplayName)}
                          </p>
                        )}
                        <VoiceMessagePlayer
                          path={m.detalhes.audio_path}
                          unavailableLabel={t('chat.voice_unavailable')}
                          isOutgoing={isMe}
                        />
                        <div className="flex justify-end items-center gap-[2px] select-none text-[12px]" style={{ color: isMe ? '#55864e' : '#8e8e93' }}>
                          <span className="font-normal leading-none">{formatTime(m.created_at)}</span>
                          {isMe && (
                            m.status === 'sending'
                              ? <Clock className="w-[14px] h-[14px] text-[#8e8e93] stroke-[2] ml-[2px]" />
                              : m.status === 'failed'
                              ? <span className="text-[12px] text-[#e53e3e] font-bold ml-[2px] leading-none">!</span>
                              : <CheckCheck className="w-[14px] h-[14px] text-[#4fae4e] stroke-[2.5] ml-[2px]" />
                          )}
                        </div>
                      </>
                    )}

                    {m.detalhes?.arquivo_url && m.detalhes?.tipo_mime === 'application/pdf' && (
                      <div
                        className="pointer-events-auto mb-1 flex min-w-0 items-center gap-2 rounded-[10px] bg-black/5 px-2.5 py-2 dark:bg-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PdfDownloadCard
                          url={m.detalhes.arquivo_url}
                          name={m.detalhes.nome_arquivo || 'documento.pdf'}
                          sizeBytes={m.detalhes.tamanho_bytes}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-300">
                            Ficheiro: {formatFileSize(m.detalhes.tamanho_bytes)}
                          </span>
                          <span className="max-w-full truncate text-[13px] font-medium">
                            {m.detalhes.nome_arquivo || 'documento.pdf'}
                          </span>
                        </span>
                      </div>
                    )}

                    {!m.detalhes?.audio_path && <div className="relative pointer-events-none leading-[1.3]">
                      {!isMe && (
                        <p
                          className="text-[13px] font-medium mb-[2px] cursor-pointer truncate"
                          style={{ color: isCommunityChat ? '#2481cc' : contactColor }}
                        >
                          {isCommunityChat ? 'Comunidade Business Messenger' : formatPhoneClean(contactDisplayName)}
                        </p>
                      )}

                      {m.mensagem && (
                        <span className="text-[16px] whitespace-pre-wrap break-words font-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          <AutoTranslatedText
                            text={m.mensagem}
                            language={language}
                            enabled={translateFullChats && !isMe}
                          />
                        </span>
                      )}
                      
                      {/* Spacer invisÃ­vel inline â€” dÃ¡ espaÃ§o ao timestamp sem forÃ§ar largura mÃ­nima */}
                      <span
                        aria-hidden="true"
                        className="inline-block h-[1px]"
                        style={{ width: isMe ? '56px' : '42px' }}
                      />

                      <div 
                        className="absolute bottom-[-1px] right-0 flex items-center gap-[2px] select-none text-[12px]"
                        style={{ color: isMe ? '#55864e' : '#8e8e93' }}
                      >
                        <span className="font-normal leading-none mt-[1px]">
                          {formatTime(m.created_at)}
                        </span>
                        {isMe && (
                          m.status === 'sending'
                            ? <Clock className="w-[14px] h-[14px] text-[#8e8e93] stroke-[2] ml-[2px]" />
                            : m.status === 'failed'
                            ? <span className="text-[12px] text-[#e53e3e] font-bold ml-[2px] leading-none">!</span>
                            : <CheckCheck className="w-[14px] h-[14px] text-[#4fae4e] stroke-[2.5] ml-[2px]" />
                        )}
                      </div>
                      {isMe && m.status === 'failed' && (
                        <p className="text-[10px] text-[#e53e3e] mt-0.5 text-right font-medium select-none leading-tight">
                          Mensagem nÃ£o enviada
                        </p>
                      )}
                    </div>}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Indicador de digitando no chat */}
        {isContactTyping && (
          <div className="flex items-end w-full justify-start relative animate-in fade-in duration-200 px-1">
            <div className="bg-white dark:bg-[#182533] rounded-[16px] rounded-bl-none px-3 py-2 shadow-[0_1px_2px_rgba(16,35,47,0.15)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] dark:bg-[#8e9aa5] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] dark:bg-[#8e9aa5] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] dark:bg-[#8e9aa5] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* EspaÃ§o extra para reaÃ§Ãµes no final */}
        <div className="h-2" />
      </main>

      {/* â”€â”€ CONTEXT MENU OVERLAY (TELEGRAM NATIVO) â”€â”€ */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end items-center px-4 pb-6 bg-black/50 backdrop-blur-xs transition-opacity"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          onClick={closeContextMenu}
        >
          <div
            ref={menuRef}
            className="w-full max-w-[325px] flex flex-col gap-2 select-none"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'slideUpMenu 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
              touchAction: 'manipulation'
            }}
          >
            {/* â”€â”€ Barra Flutuante de ReaÃ§Ãµes Telegram â”€â”€ */}
            <div className="bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-xl px-3 py-2 flex items-center justify-around border border-gray-100 dark:border-white/10">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 flex items-center justify-center text-[25px] leading-none active:scale-130 transition-transform hover:scale-115 rounded-full select-none cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                  title={`Reagir com ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* â”€â”€ Lista de AÃ§Ãµes Essenciais â”€â”€ */}
            <div className="bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-white/10">
              {menuActions.map((action, idx) => (
                <React.Fragment key={action.label}>
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#333] active:bg-gray-100 dark:active:bg-[#3a3a3a] transition-colors cursor-pointer select-none text-left"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="flex items-center gap-3.5">
                      <action.icon
                        className="w-5 h-5 shrink-0"
                        style={{ color: action.color }}
                      />
                      <div>
                        <span
                          className="text-[15px] font-medium block leading-tight text-gray-900 dark:text-gray-100"
                          style={{ color: action.color === '#e53e3e' ? '#e53e3e' : undefined }}
                        >
                          {action.label}
                        </span>
                        {action.subLabel && (
                          <span className="text-[11px] text-gray-400 block mt-0.5">{action.subLabel}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {idx < menuActions.length - 1 && (
                    <div className="h-px bg-gray-100 dark:bg-[#383838] mx-4" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* BotÃ£o Cancelar */}
            <button
              type="button"
              onClick={closeContextMenu}
              className="w-full bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-lg py-3 text-[15.5px] font-medium text-[#2481cc] hover:bg-gray-50 dark:hover:bg-[#333] active:scale-[0.99] transition-all cursor-pointer border border-gray-100 dark:border-white/10 select-none text-center"
              style={{ touchAction: 'manipulation' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ REPLY PREVIEW BAR â”€â”€ */}
      {replyTo && (
        <div className="absolute bottom-[65px] left-0 right-0 z-40 flex justify-center px-2 sm:px-6">
          <div className="w-full max-w-[1000px] bg-white dark:bg-[#17212b] border-t-2 border-[#2481cc] rounded-t-xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
            <div className="w-[3px] h-full bg-[#2481cc] rounded-full self-stretch" />
            <div className="flex-1 min-w-0">
              <span className="text-[11.5px] font-bold text-[#2481cc] block">{t('chat.replying_to')}</span>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                <AutoTranslatedText
                  text={replyTo.mensagem}
                  language={language}
                  enabled={translateFullChats && replyTo.remetente_id !== user?.id}
                />
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ BARRA DE MENSAGEM FLUTUANTE â”€â”€ */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40 flex justify-center"
        style={{
          paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
          paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
          paddingTop: '6px',
        }}
      >
        <div className="w-full max-w-[1000px] flex items-end gap-2">
          {/* Pill flutuante */}
          <div className={`flex-1 bg-white dark:bg-[#202b36] ${isComposerExpanded ? 'rounded-[24px] items-end' : 'rounded-full items-center'} shadow-[0_4px_20px_rgba(0,0,0,0.18)] flex px-3.5 py-1 min-h-[46px]`}>
            {!voiceComposerActive && <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0"
            >
              <Smile className="w-5 h-5" />
            </button>}

            {/* Thumbnail da imagem selecionada */}
            {!voiceComposerActive && imagePreview && (
              <div className="relative mr-2 ml-1 shrink-0">
                <img src={imagePreview} alt="preview" className="w-8 h-8 object-cover rounded-lg border border-gray-200 shadow-xs" />
                <button 
                  type="button" 
                  onClick={() => setImagePreview(null)} 
                  className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black cursor-pointer"
                  title={t('chat.remove_image')}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            {!voiceComposerActive && pdfPreview && (
              <div className="relative mr-2 ml-1 flex max-w-[130px] shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-1.5 py-1 dark:border-gray-600">
                <span className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-[5px] bg-[#e5484d] text-[7px] font-bold leading-none text-white">
                  <FileText className="mb-0.5 h-3 w-3" />
                  PDF
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[9px] text-gray-500 dark:text-gray-300">{t('chat.file_size').replace('{size}', formatFileSize(pdfPreview.sizeBytes))}</span>
                  <span className="truncate text-[11px] text-gray-600 dark:text-gray-300">{pdfPreview.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPdfPreview(null)}
                  className="shrink-0 rounded-full bg-gray-100 p-0.5 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                  title={t('chat.remove_pdf')}
                  aria-label={t('chat.remove_pdf')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

            {!voiceComposerActive && <textarea
              ref={inputRef}
              value={inputText}
              disabled={voiceComposerActive}
              onChange={(e) => {
                const val = e.target.value;
                setInputText(val);
                sendTypingBroadcast();
                e.target.style.height = 'auto';
                const maxHeight = 120;
                const nextHeight = Math.min(e.target.scrollHeight, maxHeight);
                e.target.style.height = `${nextHeight}px`;
                e.target.style.overflowY = e.target.scrollHeight > maxHeight ? 'auto' : 'hidden';
                setIsComposerExpanded(nextHeight > 46);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={replyTo ? t('chat.reply_placeholder') : t('chat.input_placeholder')}
              className="w-full min-h-[24px] px-2 py-2 text-[15px] bg-transparent resize-none overflow-y-hidden outline-none max-h-[120px] text-black dark:text-white placeholder:text-gray-400 font-normal leading-snug"
              rows={1}
            />}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={pdfInputRef}
              onChange={handlePdfSelect}
              accept="application/pdf,.pdf"
              className="hidden"
            />

            {!voiceComposerActive && <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={voiceComposerActive}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0 cursor-pointer"
              title={t('chat.attach_pdf')}
              aria-label={t('chat.attach_pdf')}
            >
              <Paperclip className="w-5 h-5" />
            </button>}
            {!voiceComposerActive && <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={voiceComposerActive}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0 cursor-pointer"
              title={t('chat.choose_photo')}
              aria-label={t('chat.choose_photo')}
            >
              <Camera className="w-5 h-5" />
            </button>}
            <VoiceMessageComposer
              ref={voiceComposerRef}
              onSend={handleSendVoiceMessage}
              onActiveChange={setVoiceComposerActive}
              className={voiceComposerActive ? 'flex-1' : ''}
              visible={false}
              labels={{
                record: t('chat.voice_record'),
                stop: t('chat.voice_stop'),
                cancel: t('chat.voice_cancel'),
                send: t('chat.voice_send'),
                sending: t('chat.voice_sending'),
                unsupported: t('chat.voice_unsupported'),
                permissionDenied: t('chat.voice_permission_denied'),
                tooLarge: t('chat.voice_too_large'),
                unavailable: t('chat.voice_unavailable'),
                sendFailed: t('chat.voice_send_failed'),
                storageUnavailable: t('chat.voice_storage_unavailable'),
                pause: t('chat.voice_pause'),
                resume: t('chat.voice_resume'),
              }}
            />
          </div>

          {/* BotÃ£o enviar flutuante */}
          <button
            type="button"
            onClick={() => {
              if (inputText.trim() || imagePreview || pdfPreview) {
                void handleSend();
              } else {
                void voiceComposerRef.current?.mainAction();
              }
            }}
            disabled={isSending}
            className={`w-[46px] h-[46px] shrink-0 self-center rounded-full bg-[#2481cc] text-white shadow-[0_4px_16px_rgba(36,129,204,0.45)] transition-transform hover:bg-[#1f72b5] active:scale-90 disabled:opacity-50 ${isComposerExpanded || voiceComposerActive ? 'self-end' : ''}`}
            aria-label={inputText.trim() || imagePreview || pdfPreview || voiceComposerActive ? t('common.send') : t('chat.voice_record')}
          >
            {(inputText.trim() || imagePreview || pdfPreview || voiceComposerActive)
              ? <Send className="ml-0.5 h-5 w-5" />
              : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* â”€â”€ Modal de Zoom da Imagem (VisualizaÃ§Ã£o Completa) â”€â”€ */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[300] flex h-[100dvh] w-screen flex-col items-center justify-center overflow-hidden bg-black animate-in fade-in duration-150"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <img
              src={zoomedImage}
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
              alt=""
              aria-hidden="true"
            />
            <img
              src={zoomedImage}
              className="relative z-10 h-auto w-auto max-h-full max-w-full object-contain"
              alt="Zoom"
            />
            <button 
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ AnimaÃ§Ãµes CSS injetadas â”€â”€ */}
      <style>{`
        @keyframes slideUpMenu {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes reactionIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1);   }
        }
      `}</style>
      </div>
    </div>
  );
}
