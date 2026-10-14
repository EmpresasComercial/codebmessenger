import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../components/Toast";
import { cn } from "../lib/utils";
import { 
  ChevronLeft, 
  Paperclip, 
  Camera,
  Send, 
  X, 
  CheckCheck,
  Clock,
  MoreVertical,
  ArrowDown,
  Download,
  Smile,
  ArrowLeft,
  Pencil,
  MessageCircle,
  Bell,
  LogOut,
  QrCode,
  UserPlus,
  Check,
  Reply,
  Copy,
  Trash2,
  ChevronRight,
  Loader2,
  FileText,
  Link2,
  Mic
} from 'lucide-react';
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import ChatsList from "./ChatsList";
import PdfDownloadCard, { formatFileSize } from "../components/PdfDownloadCard";
import { VoiceMessageComposer, VoiceMessagePlayer, type VoiceMessageComposerHandle } from "../components/VoiceMessage";
import { deleteVoiceMessage, uploadVoiceMessage } from "../lib/voiceMessages";
import AutoTranslatedText from "../components/AutoTranslatedText";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { COUNTRIES } from "../lib/countries";

const FORBIDDEN_WORDS = Array.from(new Set([
  "burla", "burlas", "fraude", "fraudes", "scam", "scams", "golpe", "golpes", 
  "ladrÃƒÂ£o", "ladrao", "ladrÃƒÂµes", "ladroes", "roubo", "roubos", "bosta", "bostas", 
  "merda", "merdas", "caralho", "caralhos", "foda", "fodas", "fodase", "foda-se", 
  "porra", "porras", "puta", "putas", "puta que pariu", "filho da puta", "fdp", 
  "cabrao", "cabrÃƒÂ£o", "cabroes", "cabrÃƒÂµes", "corno", "cornos", "vagabundo", "vagabundos", 
  "desgraÃƒÂ§ado", "desgracado", "desgraÃƒÂ§ados", "animal", "animais", "idiota", "idiotas", 
  "imbecil", "imbecis", "otario", "otÃƒÂ¡rio", "otarios", "otÃƒÂ¡rios", "retardado", "retardados", 
  "estupido", "estÃƒÂºpido", "estupidos", "estÃƒÂºpidos", "palhaÃƒÂ§o", "palhaco", "palhaÃƒÂ§os", "palhacos", 
  "lixo", "lixos", "nojento", "nojentos", "maldito", "malditos", "cÃƒÂ£o", "cao", "macaco", "macacos", 
  "burro", "burros", "cala boca", "vai se ferrar", "vai te ferrar", "vai morrer", 
  "sexo", "nude", "nudes", "porn", "porno", "pornografia", "pÃƒÂªnis", "penis", 
  "piroca", "pirocas", "cona", "conas", "vagina", "buceta", "bucetas", "cu", "cus", 
  "rabeta", "mamar", "chupar", "mata", "morrer", "suicida", "suicidio", "terrorista", "nazista", "racista", 
  "vou denunciar", "vou processar", "processo", "crime", "polÃƒÂ­cia", "policia", 
  "tribunal", "interpol", "cadeia", "prisÃƒÂ£o", "prisao", "fbi", "investigaÃƒÂ§ÃƒÂ£o", "investigacao", 
  "viado", "viados", "gayzinho", "bicha", "bichas", "boiola", "sapatÃƒÂ£o", "sapatao", 
  "golpista", "golpistas", "burlador", "burladores", "fraudador", "fraudadores", 
  "scammer", "scammers", "pirÃƒÂ¢mide", "piramide", "esquema ponzi", "ponzi", 
  "roubaram", "roubaste", "roubado", "roubando", "empresa falsa", "site falso", 
  "aplicativo falso", "app falso", "fake", "farsa", "enganador", "enganadora", 
  "trapaceiro", "vigarista", "171", "mafioso", "mÃƒÂ¡fia", "mafia", 
  "admin ladrÃƒÂ£o", "admin ladrao", "suporte lixo", "suporte inÃƒÂºtil", "suporte inutil", 
  "admin inÃƒÂºtil", "admin inutil", "adm corrupto", "admin corrupto", "moderador corrupto", 
  "staff lixo", "staff incompetente", "empresa corrupta", "empresa de ladrÃƒÂµes", "empresa de ladroes", 
  "dono ladrÃƒÂ£o", "dono ladrao", "vocÃƒÂªs roubam", "voces roubam", "estÃƒÂ£o roubando", "estao roubando", 
  "vocÃƒÂªs sÃƒÂ£o burlÃƒÂµes", "voces sao burloes", 
  "nÃƒÂ£o paga", "nao paga", "nÃƒÂ£o pagam", "nao pagam", "perdi dinheiro", "perdi tudo", 
  "nÃƒÂ£o recebi", "nao recebi", "sumiram com dinheiro", "bloquearam saque", "nÃƒÂ£o consigo sacar", 
  "nao consigo sacar", "site caiu", "empresa faliu", "empresa vai fechar", "vai fechar", 
  "quebrou", "falida", "falido", "sistema roubando", "dinheiro preso", "nÃƒÂ£o vale nada", "nao vale nada", 
  "ganha dinheiro rapido", "dinheiro facil", "hack", "hacker", "clonar", 
  "cartÃƒÂ£o roubado", "cartao roubado", "bitcoin gratis", "investimento falso", 
  "entra no meu link", "usa meu link", "me chama no privado", "grupo fake", "grupo falso", 
  "tenho hack", "hack saque", "hack sistema", "bug de saque", "mÃƒÂ©todo secreto", "metodo secreto", 
  "ganhar sem investir", "dinheiro fÃƒÂ¡cil", "lucro garantido", "100% garantido", 
  "nÃƒÂ£o confiem", "nao confiem", "nÃƒÂ£o invistam", "nao invistam", "isso ÃƒÂ© golpe", "isso e golpe", 
  "empresa scam", "site scam", "app scam", "plataforma scam", "plataforma falsa", "empresa fake", 
  "saque falso", "pagamento falso"
]));

const ESCAPED_FORBIDDEN = FORBIDDEN_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const FORBIDDEN_REGEX = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${ESCAPED_FORBIDDEN.join('|')})(?:[^\\p{L}\\p{N}]|$)`, 'iu');

const CONTEXT_GROUPS: Record<string, { path: string, keywords: string[] }> = {
  TelegramBusiness: { path: "/org", keywords: ["telegram business", "negÃƒÂ³cios", "conversas", "chats", "painel", "inÃƒÂ­cio", "inicio"] },
  Withdraw: { path: "/carteira", keywords: ["saque", "sacar", "retirada", "retirar", "levantamento", "levantar dinheiro", "withdraw", "withdrawal", "retrait", "retirer"] },
  Recharge: { path: "/sand-pay", keywords: ["recarga", "recarregar", "depÃƒÂ³sito", "depositar", "recharge"] },
  Invite: { path: "/convite", keywords: ["convite", "convidar", "amigo", "afiliado", "indicar"] },
  Support: { path: "/org", keywords: ["suporte", "ajuda", "atendimento", "help"] },
  Operations: { path: "/operacoes", keywords: ["operaÃƒÂ§ÃƒÂµes", "operacoes", "trabalho", "tarefa", "tarefas"] },
  ProductDetails: { path: "/botfather", keywords: ["produto", "investimento", "plano", "lucro"] }
};

const KEYWORD_TO_PATH: Record<string, string> = {};
Object.values(CONTEXT_GROUPS).forEach(group => {
  group.keywords.forEach(kw => {
    KEYWORD_TO_PATH[kw.toLowerCase()] = group.path;
  });
});

const ALL_KEYWORDS_SORTED = Object.keys(KEYWORD_TO_PATH).sort((a, b) => b.length - a.length);
const SMART_CONTEXT_REGEX = new RegExp(`(${ALL_KEYWORDS_SORTED.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const isAllowedUrl = (rawUrl: string): boolean => {
  if (!rawUrl) return false;
  try {
    const cleanUrl = rawUrl.trim().replace(/[.,;!?)]+$/, '');
    const formatted = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `https://${cleanUrl}`;
    const parsed = new URL(formatted);
    const host = parsed.hostname.toLowerCase();

    if (host === 'telegramas.cc' || host === 'www.telegramas.cc' || host.endsWith('.telegramas.cc')) {
      return true;
    }

    if (typeof window !== 'undefined' && window.location?.hostname) {
      const currentHost = window.location.hostname.toLowerCase();
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        if (host === currentHost || host.endsWith(`.${currentHost}`)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
};

const USER_COLORS = [
  "#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9"
];

function getUserColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

type SenderProfile = {
  telefone: string | null;
  nome_exibicao: string | null;
  avatarUrl?: string;
  countryCode?: string;
};

const getProfileAvatarUrl = (profile: any) => {
  let metadata = profile?.metadados;
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }

  return profile?.avatar_url
    || profile?.avatarUrl
    || profile?.foto_url
    || profile?.photo_url
    || profile?.avatar
    || profile?.imagem
    || metadata?.avatar_url
    || metadata?.foto_url
    || metadata?.photo_url
    || metadata?.picture
    || "";
};

const getProfileCountryCode = (metadata: unknown): string | undefined => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const values = metadata as Record<string, unknown>;
  const countryCode = values.country_code ?? values.countryCode;
  return typeof countryCode === "string" ? countryCode.toUpperCase() : undefined;
};

const formatSenderPhone = (phone?: string | null, countryCode?: string) => {
  const rawPhone = phone?.trim();
  if (!rawPhone || rawPhone === "Telefone Desconhecido") return "Telefone desconhecido";

  const country = COUNTRIES.find((item) => item.code === countryCode?.toUpperCase());
  const digits = rawPhone.replace(/\D/g, "");
  const storedCountry = COUNTRIES.find((item) => {
    const callingCode = item.dial_code.replace(/\D/g, "");
    return digits.startsWith(callingCode) && digits.length > callingCode.length + 5;
  });
  const hasStoredCallingCode = Boolean(storedCountry && (
    !country || storedCountry.code === country.code
  ));
  const internationalPhone = rawPhone.startsWith("+")
    ? rawPhone
    : /^00/.test(rawPhone)
      ? `+${rawPhone.slice(2).replace(/\D/g, "")}`
      : hasStoredCallingCode
        ? `+${digits}`
        : country
          ? `${country.dial_code}${digits}`
          : undefined;
  const parsed = internationalPhone
    ? parsePhoneNumberFromString(internationalPhone)
    : undefined;

  return parsed?.formatInternational() || rawPhone;
};

const getSenderLabel = (profile?: Partial<SenderProfile> | null) => {
  const phone = formatSenderPhone(profile?.telefone, profile?.countryCode);
  const name = profile?.nome_exibicao?.trim();
  return name && name !== "Membro" ? `${name} Â· ${phone}` : phone;
};

const formatTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";

const formatDateLabel = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long" });
};

const compressImage = (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

const phoneCache: Record<string, SenderProfile> = {};

const GROUP_MEMBERS = [
  {
    id: 'm1',
    name: 'Thomas Hall',
    badge: 'Admin',
    badgeType: 'admin',
    status: 'online',
    isOnline: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
  },
  {
    id: 'm2',
    name: 'Lauren Gabriella Ã°Å¸Â¥Â°',
    status: 'visto ÃƒÂ s 20:31',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
  },
  {
    id: 'm3',
    name: 'Brilson EdlÃƒÂ©zio',
    status: 'visto ÃƒÂ s 20:13',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  },
  {
    id: 'm4',
    name: 'ID 4700',
    badge: 'Dono',
    badgeType: 'owner',
    status: 'visto ÃƒÂ s 20:13',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop'
  },
  {
    id: 'm5',
    name: 'Chrina Manual',
    status: 'visto ÃƒÂ s 19:57',
    avatar: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=100&h=100&fit=crop'
  },
  {
    id: 'm6',
    name: 'PATRICIA',
    status: 'visto ÃƒÂ s 19:42',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: 'm7',
    name: 'Carlos Manuel',
    status: 'visto ÃƒÂ s 19:15',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop'
  },
  {
    id: 'm8',
    name: 'Mariana Santos',
    status: 'visto ÃƒÂ s 18:50',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop'
  },
  {
    id: 'm9',
    name: 'JoÃƒÂ£o Pedro',
    status: 'visto ÃƒÂ s 18:22',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop'
  },
  {
    id: 'm10',
    name: 'Nelson Mandela Neto',
    status: 'visto ÃƒÂ s 17:40',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop'
  }
];

const COMMUNITY_QUICK_REACTIONS = ['ðŸ‘', 'â¤ï¸', 'ðŸ‘'];

type GroupTab = 'members' | 'media' | 'files' | 'links';
interface VoiceAttachment {
  audioPath: string;
  durationSeconds: number;
}

const GROUP_TABS: { id: GroupTab; label: string }[] = [
  { id: 'members', label: 'Membros' },
  { id: 'media', label: 'MÃ­dia' },
  { id: 'files', label: 'Ficheiros' },
  { id: 'links', label: 'Links' },
];

const getMessageDetails = (message: any): Record<string, any> => {
  const details = message?.detalhes;
  if (details && typeof details === 'object' && !Array.isArray(details)) return details;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const cleanSharedUrl = (value: string) => value.trim().replace(/[.,;!?)]+$/, '');

const getContextMenuPosition = (messageElement: HTMLElement) => {
  const margin = 8;
  const menuWidth = Math.min(184, window.innerWidth - margin * 2);
  const chatBounds = messageElement.closest('.tg-chat-no-select')?.getBoundingClientRect();
  const right = chatBounds?.right ?? window.innerWidth;
  const top = chatBounds?.top ?? 0;

  return {
    x: Math.max(margin, right - menuWidth - margin),
    y: Math.max(margin, top + margin),
  };
};

interface MessageItemProps {
  message: any;
  isMe: boolean;
  displayName: string;
  displayPhone?: string;
  authorColor: string;
  showDate: boolean;
  dateLabel: string;
  timeFormatted: string;
  language: string;
  voiceUnavailableLabel: string;
  translateFullChats: boolean;
  editedLabel: string;
  isSelectedInContextMenu: boolean;
  onStartLongPress: (m: any, isMe: boolean, clientX: number, clientY: number, element: HTMLElement) => void;
  onCancelLongPress: () => void;
  onCheckMoveCancel: (clientX: number, clientY: number) => void;
  onSwipeToReply: (message: any) => void;
  onContextMenu: (e: React.MouseEvent, m: any, isMe: boolean) => void;
  onClickBubble: (e: React.MouseEvent) => void;
  onToggleReaction: (messageId: number, emoji: string) => void;
  onOpenZoomedImage: (imgUrl: string) => void;
  renderFormattedMessage: (text: string) => React.ReactNode;
}

const MessageItem = React.memo(({
  message: m,
  isMe,
  displayName,
  displayPhone,
  authorColor,
  showDate,
  dateLabel,
  timeFormatted,
  language,
  voiceUnavailableLabel,
  translateFullChats,
  editedLabel,
  isSelectedInContextMenu,
  onStartLongPress,
  onCancelLongPress,
  onCheckMoveCancel,
  onSwipeToReply,
  onContextMenu,
  onClickBubble,
  onToggleReaction,
  onOpenZoomedImage,
  renderFormattedMessage
}: MessageItemProps) => {
  const parsedData = getMessageDetails(m);
  const reply = parsedData.reply;
  const reactions = parsedData.reacoes || {};
  const isEdited = Boolean(parsedData.editado);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);

  const handleMessageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeHandledRef.current = false;
    onStartLongPress(m, isMe, touch.clientX, touch.clientY, e.currentTarget);
  };

  const handleMessageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    onCheckMoveCancel(touch.clientX, touch.clientY);
  };

  const handleMessageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    onCancelLongPress();
    const start = touchStartRef.current;
    const touch = e.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    if (deltaX >= 64 && deltaY <= 48) {
      swipeHandledRef.current = true;
      onSwipeToReply(m);
      window.setTimeout(() => {
        swipeHandledRef.current = false;
      }, 350);
    }
  };

  const handleMessageTouchCancel = () => {
    onCancelLongPress();
    touchStartRef.current = null;
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    if (swipeHandledRef.current) {
      e.preventDefault();
      e.stopPropagation();
      swipeHandledRef.current = false;
      return;
    }
    onClickBubble(e);
  };

  return (
    <React.Fragment>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="text-[12px] font-medium text-white bg-black/35 backdrop-blur-xs rounded-full px-3.5 py-0.5 shadow-2xs">
            {dateLabel}
          </span>
        </div>
      )}

      <div className={`flex ${isMe ? "items-end" : "items-start"} w-full gap-1.5 ${isMe ? "justify-end" : "justify-start"} relative group`}>
        {!isMe && (
          <div 
            className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0 mt-[2px] shadow-xs overflow-hidden select-none"
            style={{ backgroundColor: authorColor }}
          >
            {displayName.slice(0, 2).toUpperCase()}
            {m.perfil?.avatarUrl && (
              <img
                src={m.perfil.avatarUrl}
                alt=""
                className="absolute inset-0 h-full w-full rounded-full object-cover"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />
            )}
          </div>
        )}

        {/* â”€â”€ Mensagem sÃ³ com imagem (sem balÃ£o) â”€â”€ */}
        {parsedData.imagem_url && !m.mensagem?.trim() ? (
          <div
            className="relative cursor-pointer rounded-[18px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.18)] max-w-[80vw] sm:max-w-[360px]"
            onTouchStart={handleMessageTouchStart}
            onTouchMove={handleMessageTouchMove}
            onTouchEnd={handleMessageTouchEnd}
            onTouchCancel={handleMessageTouchCancel}
            onMouseDown={(e) => {
              if (e.button === 0) {
                onStartLongPress(m, isMe, e.clientX, e.clientY, e.currentTarget);
              }
            }}
            onMouseMove={(e) => {
              onCheckMoveCancel(e.clientX, e.clientY);
            }}
            onMouseUp={onCancelLongPress}
            onMouseLeave={onCancelLongPress}
            onContextMenu={(e) => onContextMenu(e, m, isMe)}
            onClick={handleMessageClick}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <img
              src={parsedData.imagem_url}
              alt="Foto"
              loading="lazy"
              decoding="async"
              className="w-full h-auto block rounded-[18px] cursor-pointer active:opacity-90"
              style={{ maxHeight: '340px', objectFit: 'cover' }}
              onClick={(e) => { e.stopPropagation(); onOpenZoomedImage(parsedData.imagem_url); }}
            />
            <div className="absolute bottom-1.5 right-2 flex items-center gap-1 bg-black/40 rounded-full px-1.5 py-0.5 select-none">
              {isEdited && (
                <span className="text-[9.5px] font-normal text-white/85 select-none">{editedLabel}</span>
              )}
              <span className="text-[10px] font-normal text-white">{timeFormatted}</span>
              {isMe && (
                m.status === 'sending'
                  ? <Clock className="w-3 h-3 text-white/70 stroke-[2]" />
                  : m.status === 'failed'
                  ? <span className="text-[10px] text-red-300 font-bold leading-none">!</span>
                  : <CheckCheck className="w-3 h-3 text-white stroke-[2.4]" />
              )}
            </div>
            {isMe && m.status === 'failed' && (
              <p className="absolute -bottom-5 right-0 text-[10px] text-[#e53e3e] font-medium select-none leading-tight whitespace-nowrap">
                Mensagem nÃ£o enviada
              </p>
            )}
            {Object.keys(reactions).length > 0 && (
              <div className="absolute -bottom-5 left-0 flex flex-wrap gap-1">
                {Object.entries(reactions).map(([emoji, users]: [string, any]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleReaction(m.id, emoji); }}
                    className="bg-white/90 border border-black/5 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm hover:bg-white active:scale-95 transition-transform cursor-pointer"
                  >
                    <span className="text-[11px]">{emoji}</span>
                    <span className="text-[10px] font-bold text-[#555555]">{(users as any[]).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* â”€â”€ Mensagem normal (texto Â± imagem) â”€â”€ */
          <div
            onTouchStart={handleMessageTouchStart}
            onTouchMove={handleMessageTouchMove}
            onTouchEnd={handleMessageTouchEnd}
            onTouchCancel={handleMessageTouchCancel}
            onMouseDown={(e) => {
              if (e.button === 0) {
                onStartLongPress(m, isMe, e.clientX, e.clientY, e.currentTarget);
              }
            }}
            onMouseMove={(e) => {
              onCheckMoveCancel(e.clientX, e.clientY);
            }}
            onMouseUp={onCancelLongPress}
            onMouseLeave={onCancelLongPress}
            onContextMenu={(e) => onContextMenu(e, m, isMe)}
            onClick={handleMessageClick}
            className={cn(
              "tg-bubble max-w-[85%] px-[10px] pt-[6px] pb-[6px] text-[#000000] dark:text-[#f3f4f6] shadow-[0_1px_2px_rgba(16,35,47,0.15)] relative cursor-pointer active:brightness-95 active:scale-[0.985] transition-all select-none",
              isMe ? "bg-[#eeffde] dark:bg-[#2b5278] is-me" : "bg-white dark:bg-[#182533] is-other is-other-top",
              isSelectedInContextMenu && "brightness-90 scale-[0.985]"
            )}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
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
                style={{ top: 0, left: -8, fill: 'currentColor' }}
              >
                <path d="M9 0H0C4.5 0 8 4 9 12V0Z" className="fill-white dark:fill-[#182533]" />
              </svg>
            )}

            {!isMe && (
              <p 
                className="flex min-w-0 items-center gap-1 text-[13px] font-medium mb-[2px] cursor-pointer"
                style={{ color: authorColor }}
              >
                <span className="truncate">{displayName}</span>
                {displayPhone && (
                  <span className="shrink-0 text-[11px] font-normal opacity-80">{displayPhone}</span>
                )}
              </p>
            )}

            {reply && (
              <div className={cn(
                "rounded-[4px] px-2 py-1 mb-1.5 text-[13px] border-l-[3px] bg-black/5 overflow-hidden",
                isMe ? "border-[#4fae4e] text-[#444444]" : "border-[#2b82c9] text-[#555555]"
              )}>
                <p className="font-medium text-[13px] text-[#2b82c9] truncate leading-tight">{reply.sender}</p>
                <p className="truncate text-[13px] text-[#666666] leading-tight mt-0.5">{reply.text || "ðŸ“· Foto"}</p>
              </div>
            )}

            {parsedData.imagem_url && (
              <div className="mb-1.5 -mx-[2px] -mt-[2px] overflow-hidden rounded-[8px]">
                <img
                  src={parsedData.imagem_url}
                  alt="Anexo"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto max-h-[260px] object-cover cursor-pointer active:opacity-90 rounded-[8px]"
                  onClick={(e) => { e.stopPropagation(); onOpenZoomedImage(parsedData.imagem_url); }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {parsedData.arquivo_url && parsedData.tipo_mime === 'application/pdf' && (
              <div className="mb-1.5 flex min-w-0 items-center gap-2 rounded-[8px] bg-black/5 px-2.5 py-2 dark:bg-white/10">
                <span onClick={(e) => e.stopPropagation()}>
                  <PdfDownloadCard
                    url={parsedData.arquivo_url}
                    name={parsedData.nome_arquivo || 'documento.pdf'}
                    sizeBytes={parsedData.tamanho_bytes}
                  />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-300">
                    Ficheiro: {formatFileSize(parsedData.tamanho_bytes)}
                  </span>
                  <span className="max-w-full truncate text-[13px] font-medium">
                    {parsedData.nome_arquivo || 'documento.pdf'}
                  </span>
                </span>
              </div>
            )}

            {parsedData.audio_path && (
              <VoiceMessagePlayer
                path={parsedData.audio_path}
                unavailableLabel={voiceUnavailableLabel}
                isOutgoing={isMe}
              />
            )}

            {!parsedData.audio_path && <div className="relative leading-[1.3]">
              <span className="text-[16px] whitespace-pre-wrap break-words font-normal">
                <AutoTranslatedText
                  text={m.mensagem}
                  language={language}
                  enabled={translateFullChats && !isMe}
                  renderFormatted={renderFormattedMessage}
                />
              </span>
              
              <span className="inline-block h-[1px]" style={{ width: isEdited ? (isMe ? '75px' : '60px') : (isMe ? '56px' : '42px') }}></span>

              <div className="absolute bottom-[-1px] right-0 flex items-center gap-[2px] select-none text-[12px]" style={{ color: isMe ? '#55864e' : '#8e8e93' }}>
                {isEdited && (
                  <span className="opacity-80 mr-[2px]">{editedLabel}</span>
                )}
                <span className="font-normal leading-none mt-[1px]">
                  {timeFormatted}
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
            {parsedData.audio_path && (
              <div className="flex justify-end items-center gap-[2px] select-none text-[12px]" style={{ color: isMe ? '#55864e' : '#8e8e93' }}>
                <span className="font-normal leading-none">{timeFormatted}</span>
                {isMe && (
                  m.status === 'sending'
                    ? <Clock className="w-[14px] h-[14px] text-[#8e8e93] stroke-[2] ml-[2px]" />
                    : m.status === 'failed'
                    ? <span className="text-[12px] text-[#e53e3e] font-bold ml-[2px] leading-none">!</span>
                    : <CheckCheck className="w-[14px] h-[14px] text-[#4fae4e] stroke-[2.5] ml-[2px]" />
                )}
              </div>
            )}

            {Object.keys(reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-black/5">
                {Object.entries(reactions).map(([emoji, users]: [string, any]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleReaction(m.id, emoji); }}
                    className="bg-white/80 border border-black/5 rounded-full px-2 py-[2px] flex items-center gap-1 shadow-2xs hover:bg-white active:scale-95 transition-transform cursor-pointer"
                  >
                    <span className="text-[12px] leading-none">{emoji}</span>
                    <span className="text-[11px] font-bold text-[#555555] leading-none">{(users as any[]).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </React.Fragment>
  );
});
MessageItem.displayName = "MessageItem";

export default function grupochat() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();
  const { language, t, translateFullChats, notificationsMuted: isGroupMuted, setNotificationsMuted: setIsGroupMuted } = useLanguage();
  const { statusText } = useNetworkStatus();

  const [publicMessages, setPublicMessages] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('community_chat_cache');
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];
      if (!navigator.onLine) return parsed;
      return parsed.filter((message: any) =>
        typeof message.id === 'number' &&
        message.id > 1000000000000 &&
        (message.status === 'sending' || message.status === 'failed')
      );
    } catch {
      return [];
    }
  });
  const [, setIsLoading] = useState(true);
  const [publicInput, setPublicInput] = useState("");
  const [voiceComposerActive, setVoiceComposerActive] = useState(false);
  const voiceComposerRef = useRef<VoiceMessageComposerHandle>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [registeredUserCount, setRegisteredUserCount] = useState<number | null>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingBroadcastRef = useRef<number>(0);
  const typingChannelRef = useRef<any>(null);
  const groupListTypingChannelRef = useRef<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ name: string; url: string; sizeBytes: number } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activeGroupTab, setActiveGroupTab] = useState<GroupTab>('members');
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    message: any;
    isMe: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const communityMembers = useMemo(() => {
    const members = new Map<string, { id: string; name: string; phone: string }>();

    publicMessages.forEach((message) => {
      const memberId = message.uid_emissor;
      if (!memberId) return;

      const profile = message.perfil || phoneCache[memberId];
      const isCurrentUser = memberId === user?.id;
      const metadataName = user?.user_metadata?.nome_exibicao
        || user?.user_metadata?.full_name
        || user?.user_metadata?.name;
      const rawPhone = isCurrentUser
        ? (profile?.telefone && profile.telefone !== 'Eu'
          ? profile.telefone
          : user?.phone || user?.user_metadata?.telefone || user?.user_metadata?.phone)
        : profile?.telefone;
      const formattedPhone = formatSenderPhone(rawPhone, profile?.countryCode);
      const savedName = profile?.nome_exibicao?.trim();
      const name = isCurrentUser
        ? (typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : 'Eu')
        : savedName && savedName !== 'Membro'
          ? savedName
          : formattedPhone;

      members.set(memberId, {
        id: memberId,
        name,
        phone: formattedPhone,
      });
    });

    return Array.from(members.values());
  }, [publicMessages, user?.id, user?.phone, user?.user_metadata]);

  const startLongPress = useCallback((
    m: any,
    isMe: boolean,
    clientX: number,
    clientY: number,
    element: HTMLElement
  ) => {
    isLongPressTriggeredRef.current = false;
    pressStartPosRef.current = { x: clientX, y: clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
        try { window.navigator.vibrate(40); } catch {}
      }
      setContextMenu({ message: m, isMe, ...getContextMenuPosition(element) });
      setShowAllReactions(false);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressStartPosRef.current = null;
  }, []);

  const checkMoveCancel = useCallback((clientX: number, clientY: number) => {
    if (!pressStartPosRef.current) return;
    const diffX = Math.abs(clientX - pressStartPosRef.current.x);
    const diffY = Math.abs(clientY - pressStartPosRef.current.y);
    if (diffX > 10 || diffY > 10) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setShowAllReactions(false);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, m: any, isMe: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    cancelLongPress();
    setContextMenu({
      message: m,
      isMe,
      ...getContextMenuPosition(e.currentTarget as HTMLElement),
    });
    setShowAllReactions(false);
  }, [cancelLongPress]);

  const handleClickBubble = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
      isLongPressTriggeredRef.current = false;
    }
  }, []);

  const handleOpenZoomedImage = useCallback((imgUrl: string) => {
    setZoomedImage(imgUrl);
  }, []);

  const handleDeleteMessage = async (msgId: number) => {
    closeContextMenu();
    if (!user?.id) {
      showToast('Mensagem nÃ£o apagada', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_gruop')
        .delete()
        .eq('id', msgId)
        .eq('uid_emissor', user.id)
        .select('id')
        .maybeSingle();

      if (error || !data) {
        showToast('Mensagem nÃ£o apagada', 'error');
        return;
      }

      if (editingMessage?.id === msgId) {
        setEditingMessage(null);
        setPublicInput("");
      }

      setPublicMessages(prev => {
        const updated = prev.filter(m => m.id !== msgId);
        try {
          if (updated.length > 0) {
            localStorage.setItem('community_chat_cache', JSON.stringify(updated.slice(-50)));
          } else {
            localStorage.removeItem('community_chat_cache');
          }
        } catch {}
        return updated;
      });
      showToast('Mensagem apagada', 'info');
    } catch {
      showToast('Mensagem nÃ£o apagada', 'error');
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // IDs de mensagens com reaÃƒÂ§ÃƒÂµes em voo (impede o realtime de sobrescrever estado otimista)
  const pendingReactionIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const composer = composerRef.current;
    const messageList = scrollRef.current;
    if (!composer || !messageList) return;

    const resizeObserver = new ResizeObserver(() => {
      const reservedSpace = Math.max(96, Math.ceil(composer.getBoundingClientRect().height + 12));

      messageList.style.paddingBottom = `${reservedSpace}px`;

      requestAnimationFrame(() => {
        messageList.scrollTop = messageList.scrollHeight;
        requestAnimationFrame(() => {
          messageList.scrollTop = messageList.scrollHeight;
        });
      });
    });

    resizeObserver.observe(composer);
    return () => resizeObserver.disconnect();
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        if (behavior === "auto") {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
      }
    });
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShowScrollDown(!isAtBottom);
    }
  };

  const handleOpenAuthorizedLink = useCallback((e: React.MouseEvent | React.TouchEvent, url: string) => {
    e.stopPropagation();
    try {
      const cleanUrl = url.trim().replace(/[.,;!?)]+$/, '');
      const targetUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
        ? cleanUrl
        : `https://${cleanUrl}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {}
  }, []);

  const renderFormattedMessage = useCallback((text: string) => {
    if (!text) return null;

    const urlParts = text.split(URL_REGEX);
    const usedGroups = new Set<string>();

    return urlParts.map((part, partIdx) => {
      if (!part) return null;

      if (/^(https?:\/\/|www\.)/i.test(part)) {
        const match = part.match(/^(.+?)([.,;!?)]*)$/);
        const candidateUrl = match ? match[1] : part;
        const trailing = match ? match[2] : '';

        if (isAllowedUrl(candidateUrl)) {
          const targetUrl = candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://')
            ? candidateUrl
            : `https://${candidateUrl}`;

          return (
            <React.Fragment key={`url-${partIdx}`}>
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleOpenAuthorizedLink(e, targetUrl);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="text-[#2481cc] dark:text-[#52a6eb] underline font-medium cursor-pointer hover:opacity-80 transition-opacity break-all select-text"
              >
                {candidateUrl}
              </a>
              {trailing}
            </React.Fragment>
          );
        }

        return part;
      }

      const kwParts = part.split(SMART_CONTEXT_REGEX);
      return (
        <React.Fragment key={`txt-${partIdx}`}>
          {kwParts.map((kwPart, kwIdx) => {
            const lowerPart = kwPart.toLowerCase();
            const path = KEYWORD_TO_PATH[lowerPart];
            if (path && !usedGroups.has(path)) {
              usedGroups.add(path);
              return (
                <span 
                  key={`kw-${partIdx}-${kwIdx}`}
                  onClick={(e) => { e.stopPropagation(); navigate(path); }}
                  className="text-[#229ED9] font-medium underline cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {kwPart}
                </span>
              );
            }
            return kwPart;
          })}
        </React.Fragment>
      );
    });
  }, [handleOpenAuthorizedLink, navigate]);

  const isFetchingRef = useRef(false);

  const fetchMessages = async (isInitial = false) => {
    if (isFetchingRef.current && !isInitial) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('chat_gruop')
        .select('*')
        .order('data_registrada', { ascending: false })
        .limit(60);
      if (error) throw error;
      if (data) {
        // 1. Atualizar mensagens IMEDIATAMENTE na tela sem esperar perfis
        const dataWithPhones = data.map((m: any) => ({
          ...m,
          perfil: {
            ...phoneCache[m.uid_emissor],
            telefone: phoneCache[m.uid_emissor]?.telefone || "Telefone Desconhecido",
            nome_exibicao: phoneCache[m.uid_emissor]?.nome_exibicao || "Membro",
            avatarUrl: phoneCache[m.uid_emissor]?.avatarUrl
              || (m.uid_emissor === user?.id ? getProfileAvatarUrl(user?.user_metadata) : ''),
            countryCode: phoneCache[m.uid_emissor]?.countryCode
              || getProfileCountryCode({ country_code: m.detalhes?.sender_country_code }),
          }
        }));

        const sorted = dataWithPhones.reverse();
        setPublicMessages(prev => {
          const pendingLocal = prev.filter(m =>
            typeof m.id === 'number' &&
            m.id > 1000000000000 &&
            (m.status === 'sending' || m.status === 'failed') &&
            !sorted.some((serverMessage: any) =>
              serverMessage.uid_emissor === m.uid_emissor &&
              serverMessage.mensagem === m.mensagem
            )
          );
          const result = [...sorted, ...pendingLocal].sort((a, b) =>
            new Date(a.data_registrada).getTime() - new Date(b.data_registrada).getTime()
          );

          try {
            if (result.length > 0) {
              localStorage.setItem('community_chat_cache', JSON.stringify(result.slice(-50)));
            } else {
              localStorage.removeItem('community_chat_cache');
            }
          } catch {}

          return result;
        });

        if (isInitial) scrollToBottom("auto");

        // 2. Buscar perfis novos em background de forma nÃ£o bloqueante
        const uncachedIds = Array.from(new Set(data.map((m: any) => m.uid_emissor).filter((id: string) => id && !phoneCache[id])));
        if (uncachedIds.length > 0) {
          (async () => {
            try {
              const { data: profiles } = await supabase
                .from('sys_t500')
                .select('*')
                .in('id', uncachedIds);
              if (profiles && profiles.length > 0) {
                profiles.forEach((p: any) => {
                  phoneCache[p.id] = {
                    telefone: p.telefone || null,
                    nome_exibicao: p.nome_exibicao || null,
                    avatarUrl: getProfileAvatarUrl(p),
                    countryCode: getProfileCountryCode(p.metadados),
                  };
                });
                setPublicMessages(prev => prev.map(m => {
                  const profile = phoneCache[m.uid_emissor];
                  const enrichedProfile = profile && {
                    ...profile,
                    countryCode: profile.countryCode
                      || getProfileCountryCode({ country_code: m.detalhes?.sender_country_code }),
                  };
                  if (profile && (
                    m.perfil?.nome_exibicao !== profile.nome_exibicao
                    || m.perfil?.telefone !== profile.telefone
                    || m.perfil?.avatarUrl !== profile.avatarUrl
                    || m.perfil?.countryCode !== enrichedProfile.countryCode
                  )) {
                    return {
                      ...m,
                      perfil: enrichedProfile
                    };
                  }
                  return m;
                }));
              }
            } catch {}
          })();
        }
      }
    } catch (err) {
      console.error("NÃ£o foi possÃ­vel carregar mensagens:", err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.onLine) {
      setPublicMessages(prev => {
        const pendingLocal = prev.filter(m =>
          typeof m.id === 'number' &&
          m.id > 1000000000000 &&
          (m.status === 'sending' || m.status === 'failed')
        );
        try {
          if (pendingLocal.length > 0) {
            localStorage.setItem('community_chat_cache', JSON.stringify(pendingLocal));
          } else {
            localStorage.removeItem('community_chat_cache');
          }
        } catch {}
        return pendingLocal;
      });
    }

    if (!navigator.onLine) {
      try {
        const cached = localStorage.getItem('community_chat_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPublicMessages(parsed);
            setIsLoading(false);
            scrollToBottom("auto");
          }
        }
      } catch (error) {
        console.error('NÃ£o foi possÃ­vel carregar o cache offline do grupo:', error);
      }
    }

    fetchMessages(true);

    const handleSync = () => {
      if (!navigator.onLine) return;
      setPublicMessages(prev => {
        const pendingLocal = prev.filter(m =>
          typeof m.id === 'number' &&
          m.id > 1000000000000 &&
          (m.status === 'sending' || m.status === 'failed')
        );
        try {
          if (pendingLocal.length > 0) {
            localStorage.setItem('community_chat_cache', JSON.stringify(pendingLocal));
          } else {
            localStorage.removeItem('community_chat_cache');
          }
        } catch {}
        return pendingLocal;
      });
      setIsLoading(true);
      fetchMessages(false);
    };
    window.addEventListener('online', handleSync);
    window.addEventListener('app:sync-data', handleSync);

    return () => { 
      window.removeEventListener('online', handleSync);
      window.removeEventListener('app:sync-data', handleSync);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadRegisteredUserCount = async () => {
      const { count, error } = await supabase
        .from('sys_t500')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error("NÃ£o foi possÃ­vel carregar o total de utilizadores:", error);
        if (isActive) showToast("NÃ£o foi possÃ­vel carregar o total de membros.", "error");
        return;
      }

      if (isActive && count !== null) setRegisteredUserCount(count);
    };

    void loadRegisteredUserCount();

    const membersChannel = supabase
      .channel('community_registered_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t500' }, () => {
        void loadRegisteredUserCount();
      })
      .subscribe((status) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && isActive) {
          console.error("NÃ£o foi possÃ­vel acompanhar alteraÃ§Ãµes no total de utilizadores:", status);
        }
      });

    return () => {
      isActive = false;
      void supabase.removeChannel(membersChannel);
    };
  }, [showToast]);

  useEffect(() => {
    if (!user) return;

    const typingChannel = supabase.channel("typing_community_chat", {
      config: {
        broadcast: { ack: false },
        presence: { key: user.id }
      }
    })
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(typingChannel.presenceState()).length);
      })
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const { userId, name } = payload.payload || {};
        if (!userId || userId === user.id) return;
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, name || "Membro");
          return newMap;
        });
        
        if (typingTimeoutsRef.current.has(userId)) {
          clearTimeout(typingTimeoutsRef.current.get(userId)!);
        }
        
        const timeoutId = setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
          typingTimeoutsRef.current.delete(userId);
        }, 3000);
        
        typingTimeoutsRef.current.set(userId, timeoutId);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          typingChannel.track({ userId: user.id }).then((trackStatus) => {
            if (trackStatus !== "ok") {
              console.error("NÃ£o foi possÃ­vel atualizar a presenÃ§a online:", trackStatus);
            }
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setOnlineCount(null);
        }
      });

    const groupListTypingChannel = supabase
      .channel('chatslist_typing_global', { config: { broadcast: { ack: false } } })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error("NÃ£o foi possÃ­vel transmitir a digitaÃ§Ã£o do grupo para a lista:", status);
        }
      });

    const channel = supabase.channel("tg_community_chat_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_gruop" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setPublicMessages(prev => {
            const updated = prev.filter(m => m.id !== payload.old.id);
            try {
              if (updated.length > 0) {
                localStorage.setItem('community_chat_cache', JSON.stringify(updated.slice(-50)));
              } else {
                localStorage.removeItem('community_chat_cache');
              }
            } catch {}
            return updated;
          });
          return;
        }
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const data: any = payload.new;
          if (data && data.id) { 
            const senderProfile = phoneCache[data.uid_emissor] || null;
            if (!senderProfile && data.uid_emissor) {
              supabase
                .from('sys_t500')
                .select('*')
                .eq('id', data.uid_emissor)
                .maybeSingle()
                .then(({ data: prof }) => {
                  if (prof) {
                    const resolvedProfile: SenderProfile = {
                      telefone: prof.telefone || null,
                      nome_exibicao: prof.nome_exibicao || null,
                      avatarUrl: getProfileAvatarUrl(prof),
                      countryCode: getProfileCountryCode(prof.metadados),
                    };
                    phoneCache[data.uid_emissor] = resolvedProfile;
                    setPublicMessages(prev => prev.map(m => m.uid_emissor === data.uid_emissor
                      ? { ...m, perfil: resolvedProfile }
                      : m
                    ));
                  }
                });
            }
            const dataWithPhone = { 
              ...data, 
              perfil: {
                telefone: senderProfile?.telefone || "Telefone Desconhecido",
                nome_exibicao: senderProfile?.nome_exibicao || "Membro",
                avatarUrl: senderProfile?.avatarUrl
                  || (data.uid_emissor === user.id ? getProfileAvatarUrl(user.user_metadata) : ''),
                countryCode: senderProfile?.countryCode
                  || getProfileCountryCode({ country_code: data.detalhes?.sender_country_code }),
              } 
            };
            setPublicMessages((c) => {
              if (payload.eventType === "UPDATE") {
                return c.map(m => {
                  if (m.id !== data.id) return m;
                  if (pendingReactionIds.current.has(data.id)) {
                    const localDetalhes = (m.detalhes && typeof m.detalhes === 'object') ? (m.detalhes as any) : {};
                    const serverDetalhes = (dataWithPhone.detalhes && typeof dataWithPhone.detalhes === 'object') ? (dataWithPhone.detalhes as any) : {};
                    const mergedDetalhes = { ...serverDetalhes, reacoes: localDetalhes.reacoes || serverDetalhes.reacoes };
                    return { ...dataWithPhone, detalhes: mergedDetalhes };
                  }
                  return dataWithPhone;
                });
              }

              if (
                payload.eventType === "INSERT" &&
                data.uid_emissor === user?.id &&
                c.some(m =>
                  typeof m.id === 'number' &&
                  m.id > 1000000000000 &&
                  m.uid_emissor === data.uid_emissor &&
                  m.mensagem === data.mensagem &&
                  m.status === 'sending'
                )
              ) {
                return c;
              }

              const withoutTemp = c.filter(m => !(
                typeof m.id === 'number' &&
                m.id > 1000000000000 &&
                m.uid_emissor === data.uid_emissor &&
                m.mensagem === data.mensagem
              ));
              if (withoutTemp.some(m => m.id === data.id)) {
                return withoutTemp.map(m => m.id === data.id ? dataWithPhone : m);
              }
              const updated = [...withoutTemp, dataWithPhone];
              try {
                localStorage.setItem('community_chat_cache', JSON.stringify(updated.slice(-50)));
              } catch {}
              return updated;
            }); 
            if (payload.eventType === "INSERT") {
              scrollToBottom();
            }
          }
        }
      }).subscribe();
      
    typingChannelRef.current = typingChannel;
    groupListTypingChannelRef.current = groupListTypingChannel;

    return () => { 
      supabase.removeChannel(channel); 
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(groupListTypingChannel);
      typingChannelRef.current = null;
      groupListTypingChannelRef.current = null;
      // Limpa os timers
      Array.from(typingTimeoutsRef.current.values()).forEach(clearTimeout);
      typingTimeoutsRef.current.clear();
    };
  }, [user]);

  const sendTypingBroadcast = () => {
    if (!user) return;
    const now = Date.now();
    const typingName = phoneCache[user.id]?.nome_exibicao
      || user.user_metadata?.nome_exibicao
      || user.phone
      || "Membro";
    if (now - lastTypingBroadcastRef.current > 1800 && typingChannelRef.current) {
      lastTypingBroadcastRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          name: typingName
        }
      });
      groupListTypingChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          name: typingName,
          targetId: 'community'
        }
      });
    }
  };

  const validateMessage = (text: string) => {
    if (text.length > 2000) return "A mensagem Ã© muito longa.";
    if (FORBIDDEN_REGEX.test(text)) return "Por favor, evite termos ofensivos.";
    const matches = text.match(URL_REGEX);
    if (matches) {
      if (matches.some(m => !isAllowedUrl(m))) {
        return "NÃ£o sÃ£o permitidos links externos.";
      }
    }
    return null;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith('image/')) {
      showToast("Selecione uma imagem vÃ¡lida.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("MÃ¡ximo 10MB.", "error");
      return;
    }
    try {
      const compressed = await compressImage(file, 1280, 1280, 0.75);
      setImagePreview(compressed);
      setPdfPreview(null);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setImagePreview(ev.target.result);
          setPdfPreview(null);
        } else {
          showToast("NÃ£o foi possÃ­vel abrir a imagem selecionada.", "error");
        }
      };
      reader.onerror = () => showToast("NÃ£o foi possÃ­vel abrir a imagem selecionada.", "error");
      reader.readAsDataURL(file);
    }
  };

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast("Selecione um documento PDF.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("O PDF nÃ£o pode exceder 10MB.", "error");
      return;
    }

    try {
      const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (new TextDecoder().decode(signature) !== '%PDF-') {
        showToast("O ficheiro selecionado nÃ£o Ã© um PDF vÃ¡lido.", "error");
        return;
      }
    } catch {
      showToast("NÃ£o foi possÃ­vel validar o PDF selecionado.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        showToast("NÃ£o foi possÃ­vel abrir o PDF selecionado.", "error");
        return;
      }
      setPdfPreview({ name: file.name, url: reader.result, sizeBytes: file.size });
      setImagePreview(null);
    };
    reader.onerror = () => {
      showToast("NÃ£o foi possÃ­vel abrir o PDF selecionado.", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (voiceAttachment?: VoiceAttachment) => {
    if (!user || (!publicInput.trim() && !imagePreview && !pdfPreview && !voiceAttachment)) return;
    if (publicInput.trim()) {
      const err = validateMessage(publicInput.trim());
      if (err) { showToast(err, "error"); return; }
    }
    const tempMsg = publicInput.trim() || (voiceAttachment ? t('chat.voice_message') : '');

    // Ã¢â€â‚¬Ã¢â€â‚¬ Fluxo de EdiÃƒÂ§ÃƒÂ£o de Mensagem Existente Ã¢â€â‚¬Ã¢â€â‚¬
    if (editingMessage) {
      const msgIdToEdit = editingMessage.id;
      const prevDetalhes = (editingMessage.detalhes && typeof editingMessage.detalhes === 'object')
        ? { ...editingMessage.detalhes }
        : {};
      const updatedDetalhes = {
        ...prevDetalhes,
        editado: true,
        editado_em: new Date().toISOString()
      };

      setEditingMessage(null);
      setPublicInput("");
      setIsComposerExpanded(false);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.style.height = "auto";
        inputRef.current.style.overflowY = "hidden";
      }

      // AtualizaÃƒÂ§ÃƒÂ£o otimista local imediata
      setPublicMessages(prev => prev.map(m => {
        if (m.id === msgIdToEdit) {
          return {
            ...m,
            mensagem: tempMsg,
            detalhes: updatedDetalhes
          };
        }
        return m;
      }));

      setIsSending(true);
      try {
        const { error } = await supabase
          .from("chat_gruop")
          .update({
            mensagem: tempMsg,
            detalhes: updatedDetalhes
          })
          .eq("id", msgIdToEdit);

        if (error) {
          console.error('[CommunityChat] Erro ao editar mensagem:', error);
          showToast('Erro ao atualizar a mensagem', 'error');
        } else {
          showToast('Mensagem editada', 'success');
        }
      } catch (err) {
        console.error('[CommunityChat] Falha na ediÃƒÂ§ÃƒÂ£o:', err);
        showToast('Erro ao atualizar a mensagem', 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

    const tempImg = imagePreview;
    const tempPdf = pdfPreview;
    const tempReply = replyTo;
    const detalhes: Record<string, any> = {};
    if (typeof user?.user_metadata?.country_code === "string") {
      detalhes.sender_country_code = user.user_metadata.country_code;
    }
    if (tempImg) { detalhes.imagem_url = tempImg; detalhes.tipo_midia = 'imagem'; }
    if (tempPdf) {
      detalhes.arquivo_url = tempPdf.url;
      detalhes.nome_arquivo = tempPdf.name;
      detalhes.tamanho_bytes = tempPdf.sizeBytes;
      detalhes.tipo_mime = 'application/pdf';
      detalhes.tipo_midia = 'documento';
    }
    if (voiceAttachment) {
      detalhes.audio_path = voiceAttachment.audioPath;
      detalhes.audio_duration_seconds = voiceAttachment.durationSeconds;
      detalhes.tipo_midia = 'audio';
    }
    if (tempReply) {
      detalhes.resposta_para_id = tempReply.id;
      detalhes.reply = { id: tempReply.id, text: tempReply.mensagem, sender: getSenderLabel(tempReply.perfil) };
    }

    setPublicInput("");
    setIsComposerExpanded(false);
    setImagePreview(null);
    setPdfPreview(null);
    setReplyTo(null);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
      inputRef.current.style.overflowY = "hidden";
      inputRef.current.focus();
    }

    const tempId = Date.now();
    const optimisticMessage = {
      id: tempId,
      uid_emissor: user.id,
      mensagem: tempMsg || "",
      detalhes,
      data_registrada: new Date().toISOString(),
      perfil: { telefone: "Eu", nome_exibicao: "Eu" },
      status: 'sending' as const
    };
    setPublicMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    setIsSending(true);
    try {
      const payload = {
        uid_emissor: user.id,
        mensagem: tempMsg || " ",
        detalhes,
      };
      console.log('[CommunityChat] Enviando para chat_gruop:', payload);
      const { data: insertedMsg, error } = await supabase
        .from("chat_gruop")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[CommunityChat] Erro insert:', error.code, error.message, error.details, error.hint);
        throw error;
      }
      if (insertedMsg) {
        setPublicMessages(prev => {
          const updated = prev.map(m => m.id === tempId ? {
            ...insertedMsg,
            perfil: {
              telefone: phoneCache[user.id]?.telefone || "Eu",
              nome_exibicao: phoneCache[user.id]?.nome_exibicao || "Eu"
            },
            status: 'sent' as const
          } : m);
          try {
            localStorage.setItem('community_chat_cache', JSON.stringify(updated.slice(-50)));
          } catch {}
          return updated;
        });
      }
      console.log('[CommunityChat] Mensagem inserida com sucesso');
      scrollToBottom();
    } catch (err: any) { 
      console.error("Ops! mensagem nÃƒÂ£o enviada", err);
      if (voiceAttachment) {
        setPublicMessages(prev => {
          const updated = prev.filter(message => message.id !== tempId);
          try {
            localStorage.setItem('community_chat_cache', JSON.stringify(updated.slice(-50)));
          } catch {}
          return updated;
        });
        try {
          await deleteVoiceMessage(voiceAttachment.audioPath);
        } catch (cleanupError) {
          console.error('[CommunityChat] Could not remove an unsent voice message:', cleanupError);
        }
        throw err;
      }
      setPublicMessages(prev => {
        const updated = prev.map(m => m.id === tempId ? { ...m, status: 'failed' as const } : m);
        try {
          localStorage.setItem('community_chat_cache', JSON.stringify(updated.slice(-50)));
        } catch {}
        return updated;
      });
      showToast('Mensagem nÃ£o enviada', 'error'); 
    } finally { 
      setIsSending(false); 
    }

  };

  const handleSendVoiceMessage = async (blob: Blob, durationSeconds: number) => {
    if (!user) throw new Error('A signed-in user is required to send voice messages.');
    try {
      const audioPath = await uploadVoiceMessage(blob, user.id, { type: 'group' });
      await handleSend({ audioPath, durationSeconds });
    } catch (error) {
      console.error('[CommunityChat] Could not upload voice message:', error);
      throw error;
    }
  };


  const handleToggleReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!user) return;
    closeContextMenu();

    setPublicMessages(prev => {
      const targetMsg = prev.find(m => m.id === messageId);
      if (!targetMsg) return prev;

      const prevDetalhes = (targetMsg.detalhes && typeof targetMsg.detalhes === 'object')
        ? { ...targetMsg.detalhes }
        : {};
      const currentReactions: Record<string, string[]> = { ...(prevDetalhes.reacoes || {}) };
      const usersForEmoji: string[] = Array.isArray(currentReactions[emoji]) 
        ? [...currentReactions[emoji]] 
        : [];
      const hasReacted = usersForEmoji.includes(user.id);

      if (hasReacted) {
        const filtered = usersForEmoji.filter(uid => uid !== user.id);
        if (filtered.length === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = filtered;
        }
      } else {
        currentReactions[emoji] = [...usersForEmoji, user.id];
      }

      const updatedDetalhes = {
        ...prevDetalhes,
        reacoes: currentReactions
      };

      pendingReactionIds.current.add(messageId);

      (async () => {
        try {
          const { error } = await supabase
            .from('chat_gruop')
            .update({ detalhes: updatedDetalhes })
            .eq('id', messageId);
          if (error) console.error('[CommunityChat] Erro ao salvar reaÃ§Ã£o:', error);
        } catch (err: any) {
          console.error('[CommunityChat] Falha ao persistir reaÃ§Ã£o:', err);
        } finally {
          setTimeout(() => pendingReactionIds.current.delete(messageId), 3000);
        }
      })();

      return prev.map(m => m.id === messageId ? { ...m, detalhes: updatedDetalhes } : m);
    });
  }, [user, closeContextMenu]);

  const handleDownloadImage = async (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagem_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Download concluÃƒÂ­do!', 'success');
    } catch {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `imagem_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ AÃƒÂ§ÃƒÂµes do Menu de Contexto Telegram Ã¢â€â‚¬Ã¢â€â‚¬
  const menuActions: Array<{
    icon: any;
    label: string;
    onClick: () => void;
    color: string;
    subLabel?: string;
  }> = contextMenu ? [
    { 
      icon: Reply, 
      label: 'Responder', 
      onClick: () => { 
        setEditingMessage(null);
        setReplyTo(contextMenu.message); 
        closeContextMenu(); 
        setTimeout(() => inputRef.current?.focus(), 100); 
      }, 
      color: '#2481cc' 
    },
    { 
      icon: Copy, 
      label: 'Copiar', 
      onClick: () => { 
        navigator.clipboard.writeText(contextMenu.message.mensagem || '').catch(() => {}); 
        showToast('Mensagem copiada!', 'success'); 
        closeContextMenu(); 
      }, 
      color: '#555' 
    },
    ...(contextMenu.isMe ? [{ 
      icon: Pencil, 
      label: 'Editar', 
      onClick: () => { 
        setReplyTo(null);
        setEditingMessage(contextMenu.message); 
        setPublicInput(contextMenu.message.mensagem || ''); 
        closeContextMenu(); 
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.style.height = "auto";
            const maxHeight = 120;
            const nextHeight = Math.min(inputRef.current.scrollHeight, maxHeight);
            inputRef.current.style.height = `${nextHeight}px`;
            inputRef.current.style.overflowY = inputRef.current.scrollHeight > maxHeight ? "auto" : "hidden";
            setIsComposerExpanded(nextHeight > 46);
            inputRef.current.selectionStart = inputRef.current.value.length;
            inputRef.current.selectionEnd = inputRef.current.value.length;
          }
        }, 100); 
      }, 
      color: '#555' 
    }] : []),
    ...(contextMenu.isMe ? [{ 
      icon: Trash2, 
      label: 'Apagar', 
      onClick: () => handleDeleteMessage(contextMenu.message.id), 
      color: '#e53e3e'
    }] : [])
  ] : [];

  const sharedPhotos = publicMessages.flatMap((message: any, index: number) => {
    const details = getMessageDetails(message);
    const url = details.imagem_url || details.photo_url;
    return typeof url === 'string' && url
      ? [{ id: `${message.id}-photo-${index}`, url }]
      : [];
  }).reverse();

  const sharedFiles = publicMessages.flatMap((message: any, index: number) => {
    const details = getMessageDetails(message);
    const messageFiles = Array.isArray(details.arquivos) ? details.arquivos : [details];
    return messageFiles.flatMap((file: any, fileIndex: number) => {
      const url = file?.arquivo_url || file?.file_url || file?.document_url || file?.documento_url || file?.attachment_url;
      if (typeof url !== 'string' || !url) return [];
      return [{
        id: `${message.id}-file-${index}-${fileIndex}`,
        url,
        name: file.nome_arquivo || file.file_name || file.filename || file.name || 'Ficheiro',
        type: file.tipo_mime || file.mime_type || file.content_type || '',
        sizeBytes: file.tamanho_bytes || file.size_bytes || file.file_size
      }];
    });
  }).reverse();

  const sharedLinks = Array.from(new Map(publicMessages.flatMap((message: any) => {
    const details = getMessageDetails(message);
    const linksInDetails = [
      details.link_url,
      ...(Array.isArray(details.links) ? details.links : [])
    ].filter((link): link is string => typeof link === 'string');
    const linksInText = typeof message.mensagem === 'string'
      ? message.mensagem.match(URL_REGEX) || []
      : [];

    return [...linksInDetails, ...linksInText].flatMap((rawUrl) => {
      const cleaned = cleanSharedUrl(rawUrl);
      const href = cleaned.startsWith('www.') ? `https://${cleaned}` : cleaned;
      try {
        const parsedUrl = new URL(href);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return [];
        return [[href, {
          url: href,
          label: parsedUrl.hostname.replace(/^www\./, ''),
          message: message.mensagem || '',
          id: message.id
        }] as const];
      } catch {
        return [];
      }
    });
  })).values());

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
      <div className="h-[68px] shrink-0 md:hidden" aria-hidden="true" />
      <header className="fixed left-0 right-0 top-0 z-40 flex w-full shrink-0 select-none items-center justify-between bg-transparent px-3 py-3 pointer-events-none sm:px-4 md:sticky md:left-auto md:right-auto md:top-0">
        <button 
          onClick={() => navigate('/org')} 
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto md:hidden"
          aria-label="Voltar aos chats"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2]" />
        </button>

        <div 
          onClick={() => setShowInfo(true)} 
          className="flex w-0 flex-1 items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 cursor-pointer active:scale-[0.98] transition-transform pointer-events-auto"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
            <img src="/logo-tb.jpg" alt="Business Messenger" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-medium text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
              Business Messenger Empresa
            </h1>
            <span className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] font-normal leading-[1.15] mt-0.5 truncate flex items-center gap-1">
              {statusText ? (
                <>
                  <Loader2 className="w-3 h-3 text-[#2481cc] animate-spin shrink-0" />
                  <span className="text-[#2481cc] font-medium">{statusText}</span>
                </>
              ) : typingUsers.size > 0 ? (
                <span className="text-[#2481cc] font-medium italic">
                  {Array.from(typingUsers.values()).join(', ')} digitando...
                </span>
              ) : (
                onlineCount === null ? "2 membros" : `${onlineCount} online`
              )}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowInfo(true)} 
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto"
          aria-label="Mais informaÃƒÂ§ÃƒÂµes"
        >
          <MoreVertical className="w-[22px] h-[22px]" />
        </button>
      </header>

      <main 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="w-full min-h-0 flex-1 overflow-y-auto no-scrollbar px-3 sm:px-4 md:px-6 pt-2 pb-24 space-y-1.5 relative [overflow-anchor:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {publicMessages.map((m, i) => {
          const isMe = m.uid_emissor === user?.id;
          const savedName = m.perfil?.nome_exibicao?.trim();
          const hasSavedName = Boolean(savedName && savedName !== "Membro");
          const senderPhone = formatSenderPhone(m.perfil?.telefone, m.perfil?.countryCode);
          const displayName = isMe ? "Eu" : hasSavedName ? savedName : senderPhone;
          const displayPhone = !isMe && hasSavedName ? senderPhone : undefined;
          const prevDate = i > 0 ? formatDateLabel(publicMessages[i - 1].data_registrada) : "";
          const currDate = formatDateLabel(m.data_registrada);
          const showDate = i === 0 || currDate !== prevDate;
          const authorColor = getUserColor(displayName);

          return (
            <MessageItem
              key={m.id}
              message={m}
              isMe={isMe}
              displayName={displayName}
              displayPhone={displayPhone}
              authorColor={authorColor}
              showDate={showDate}
              dateLabel={currDate}
              timeFormatted={formatTime(m.data_registrada)}
              language={language}
              voiceUnavailableLabel={t('chat.voice_unavailable')}
              translateFullChats={translateFullChats}
              editedLabel={t('group.edited')}
              isSelectedInContextMenu={contextMenu?.message?.id === m.id}
              onStartLongPress={startLongPress}
              onCancelLongPress={cancelLongPress}
              onCheckMoveCancel={checkMoveCancel}
              onSwipeToReply={(message) => {
                setEditingMessage(null);
                setReplyTo(message);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              onContextMenu={handleContextMenu}
              onClickBubble={handleClickBubble}
              onToggleReaction={handleToggleReaction}
              onOpenZoomedImage={handleOpenZoomedImage}
              renderFormattedMessage={renderFormattedMessage}
            />
          );
        })}
        {/* Indicador de digitando no chat */}
        {typingUsers.size > 0 && (
          <div className="flex items-end w-full justify-start relative animate-in fade-in duration-200 px-1">
            <div className="bg-white dark:bg-[#182533] rounded-[16px] rounded-bl-none px-3 py-2 shadow-[0_1px_2px_rgba(16,35,47,0.15)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] dark:bg-[#8e9aa5] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] dark:bg-[#8e9aa5] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] dark:bg-[#8e9aa5] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showScrollDown && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-[74px] right-4 w-10 h-10 bg-white text-gray-700 rounded-full shadow-lg flex items-center justify-center z-40 active:scale-90 transition-transform cursor-pointer border border-gray-100"
            aria-label="Rolar para o fundo"
          >
            <ArrowDown className="w-5 h-5 stroke-[2.2]" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 p-2.5 z-40 flex justify-center">
        <div ref={composerRef} className="w-full max-w-[480px] flex flex-col gap-1.5">
          <AnimatePresence>
            {editingMessage && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="bg-white/95 backdrop-blur-md border-l-[3px] border-[#2481cc] rounded-[14px] px-3 py-1.5 shadow-md flex justify-between items-center"
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <Pencil className="w-4 h-4 text-[#2481cc] shrink-0 stroke-[2.2]" />
                  <div className="truncate flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#2481cc] leading-tight">
                      Editar mensagem
                    </p>
                    <p className="text-[11px] text-[#777777] truncate italic leading-tight">
                      {editingMessage.mensagem || 'Foto'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingMessage(null);
                    setPublicInput("");
                    if (inputRef.current) {
                      inputRef.current.value = "";
                      inputRef.current.style.height = "auto";
                    }
                  }} 
                  className="text-gray-400 hover:text-black p-1 cursor-pointer shrink-0"
                  title="Cancelar ediÃƒÂ§ÃƒÂ£o"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </motion.div>
            )}

            {replyTo && !editingMessage && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="bg-white/95 backdrop-blur-md border-l-[3px] border-[#2481cc] rounded-[14px] px-3 py-1.5 shadow-md flex justify-between items-center"
              >
                <div className="truncate flex-1">
                  <p className="text-[11px] font-bold text-[#2481cc]">
                    A responder a {getSenderLabel(replyTo.perfil)}
                  </p>
                  <p className="text-[11px] text-[#777777] truncate italic">
                    <AutoTranslatedText
                      text={replyTo.mensagem}
                      language={language}
                      enabled={translateFullChats}
                      renderFormatted={(text) => text || 'Foto'}
                    />
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setReplyTo(null)} 
                  className="text-gray-400 hover:text-black p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
            />
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              ref={pdfInputRef}
              onChange={handlePdfSelect}
            />

            <div className={`flex-1 bg-white ${isComposerExpanded && !voiceComposerActive ? 'rounded-[24px] items-end' : 'rounded-full items-center'} shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex px-3.5 py-1.5 min-h-[46px] border border-gray-100/80`}>
              {!voiceComposerActive && <>
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0"
                title="Emojis"
              >
                <Smile className="w-6 h-6 stroke-[1.8]" />
              </button>

              {imagePreview && (
                <div className="relative mr-2 shrink-0">
                  <img src={imagePreview} alt="preview" className="w-8 h-8 object-cover rounded-lg border border-gray-200" />
                  <button 
                    type="button" 
                    onClick={() => setImagePreview(null)} 
                    className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
              {pdfPreview && (
                <div className="relative mr-2 flex max-w-[130px] shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-1.5 py-1">
                  <span className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-[5px] bg-[#e5484d] text-[7px] font-bold leading-none text-white">
                    <FileText className="mb-0.5 h-3 w-3" />
                    PDF
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[9px] text-gray-500">Ficheiro: {formatFileSize(pdfPreview.sizeBytes)}</span>
                    <span className="truncate text-[11px] text-gray-600">{pdfPreview.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdfPreview(null)}
                    className="shrink-0 rounded-full bg-gray-100 p-0.5 text-gray-500 hover:bg-gray-200"
                    aria-label="Remover PDF"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              <textarea
                ref={inputRef}
                value={publicInput}
                disabled={voiceComposerActive}
                onChange={(e) => {
                  setPublicInput(e.target.value);
                  e.target.style.height = "auto";
                  const maxHeight = 120;
                  const nextHeight = Math.min(e.target.scrollHeight, maxHeight);
                  e.target.style.height = `${nextHeight}px`;
                  e.target.style.overflowY = e.target.scrollHeight > maxHeight ? "auto" : "hidden";
                  setIsComposerExpanded(nextHeight > 46);
                  sendTypingBroadcast();
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    handleSend(); 
                  } else if (e.key === 'Escape' && editingMessage) {
                    e.preventDefault();
                    setEditingMessage(null);
                    setPublicInput("");
                    setIsComposerExpanded(false);
                    if (inputRef.current) {
                      inputRef.current.value = "";
                      inputRef.current.style.height = "auto";
                      inputRef.current.style.overflowY = "hidden";
                    }
                  }
                }}
                placeholder={editingMessage ? "Editar mensagem..." : "Mensagem"}
                className="w-full min-h-[24px] px-2 py-1.5 text-[14px] bg-transparent resize-none overflow-y-hidden outline-none max-h-[120px] text-black placeholder:text-gray-400 font-normal leading-snug"
                rows={1}
              />

              <button 
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={voiceComposerActive}
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0 rotate-[-45deg]"
                title="Anexar PDF"
                aria-label="Anexar PDF"
              >
                <Paperclip className="w-5 h-5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={voiceComposerActive}
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0"
                title="Escolher foto"
                aria-label="Escolher foto"
              >
                <Camera className="w-5 h-5 stroke-[1.8]" />
              </button>
              </>}
              <VoiceMessageComposer
                ref={voiceComposerRef}
                onSend={handleSendVoiceMessage}
                onActiveChange={setVoiceComposerActive}
                className={voiceComposerActive ? 'flex-1' : ''}
                visible={false}
                disabled={isSending}
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

            <button
              type="button"
              onClick={() => {
                if (editingMessage || publicInput.trim() || imagePreview || pdfPreview) {
                  void handleSend();
                } else {
                  void voiceComposerRef.current?.mainAction();
                }
              }}
              disabled={isSending || (editingMessage ? !publicInput.trim() : false)}
              style={{ borderRadius: '9999px' }}
              className="w-[46px] h-[46px] !rounded-full rounded-full bg-[#2481cc] hover:bg-[#1f72b5] text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_10px_rgba(36,129,204,0.4)] cursor-pointer disabled:opacity-50"
              title={editingMessage ? "Salvar alteraÃƒÂ§ÃƒÂµes" : (publicInput.trim() || imagePreview || pdfPreview || voiceComposerActive) ? t('common.send') : t('chat.voice_record')}
              aria-label={editingMessage ? "Salvar alteraÃƒÂ§ÃƒÂµes" : (publicInput.trim() || imagePreview || pdfPreview || voiceComposerActive) ? t('common.send') : t('chat.voice_record')}
            >
              {editingMessage ? (
                <Check className="w-5 h-5 text-white stroke-[2.5]" />
              ) : (publicInput.trim() || imagePreview || pdfPreview || voiceComposerActive) ? (
                <Send className="w-5 h-5 text-white ml-0.5 stroke-[2]" />
              ) : (
                <Mic className="w-5 h-5 text-white stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            key="group-info"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-[250] flex flex-col select-none"
            style={{ backgroundColor: '#efeff4' }}
          >
            {/* Ã¢â€â‚¬Ã¢â€â‚¬ Header: Ãƒâ€” Group Info [icon] Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <div
              className="w-full flex items-center justify-between px-4 pt-3 pb-3 sticky top-0 z-10"
              style={{ backgroundColor: '#efeff4' }}
            >
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="w-9 h-9 flex items-center justify-center text-[#8e8e93] active:opacity-50 transition-opacity cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
              <span className="text-[17px] font-semibold text-[#111] dark:text-white tracking-tight">
                Group Info
              </span>
              <div className="w-9 h-9"></div>
            </div>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ Scrollable content Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <div className="flex-1 overflow-y-auto">

              {/* Ã¢â€â‚¬Ã¢â€â‚¬ Avatar + Nome + Membros Ã¢â€â‚¬Ã¢â€â‚¬ */}
              <div className="flex flex-col items-center pt-6 pb-5 px-4">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden mb-4">
                  <img src="/logo-tb.jpg" alt="Business Messenger" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-[18px] font-bold text-[#111] text-center leading-tight">
                  Business Messenger Empresa
                </h1>
                <p className="text-[13px] mt-1" style={{ color: '#8e8e93' }}>
                  {registeredUserCount === null
                    ? 'â€” members'
                    : `${registeredUserCount} ${registeredUserCount === 1 ? 'member' : 'members'}`}
                </p>
              </div>

              {/* Ã¢â€â‚¬Ã¢â€â‚¬ Card branco: Link + Notifications Ã¢â€â‚¬Ã¢â€â‚¬ */}
              <div className="mx-4 mb-4 rounded-[12px] bg-white overflow-hidden shadow-xs">
                {/* Link row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-50 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText('http://telegramas.cc/web');
                    setIsCopiedLink(true);
                    showToast('Link copiado!', 'success');
                    setTimeout(() => setIsCopiedLink(false), 2000);
                  }}
                >
                  <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#ff9500' }}>
                    <QrCode className="w-[17px] h-[17px] text-white stroke-[2]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] truncate" style={{ color: '#007aff' }}>
                      {isCopiedLink ? 'Copiado!' : 'http://telegramas.cc/web'}
                    </span>
                    <span className="text-[12px]" style={{ color: '#8e8e93' }}>Link</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px ml-[56px]" style={{ backgroundColor: '#c8c7cc' }} />

                {/* Notifications row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#ff3b30' }}>
                    <Bell className="w-[17px] h-[17px] text-white stroke-[2]" />
                  </div>
                  <span className="flex-1 text-[14px] text-[#111]">{t('group.notifications')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupMuted(!isGroupMuted);
                      showToast(isGroupMuted ? t('group.notifications_on') : t('group.notifications_off'), 'info');
                    }}
                    className="relative w-[34px] h-[14px] rounded-full cursor-pointer focus:outline-none shrink-0 transition-colors duration-200"
                    style={{ backgroundColor: isGroupMuted ? '#d1d1d6' : '#007aff' }}
                    aria-label="Toggle notifications"
                  >
                    <span
                      className="absolute top-[-3px] left-[-1px] w-[20px] h-[20px] bg-white rounded-full transition-transform duration-200"
                      style={{ 
                        transform: isGroupMuted ? 'translateX(0px)' : 'translateX(16px)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        border: isGroupMuted ? '1px solid #d1d1d6' : '1px solid #007aff'
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Ã¢â€â‚¬Ã¢â€â‚¬ Abas: Members | Media | Files | Links Ã¢â€â‚¬Ã¢â€â‚¬ */}
              <div className="bg-white border-b border-gray-200 sticky top-[56px] z-[5]">
                <div className="flex">
                  {GROUP_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveGroupTab(tab.id)}
                      className="flex-1 py-3 text-[13px] font-medium transition-colors cursor-pointer relative"
                      style={{
                        color: activeGroupTab === tab.id ? '#007aff' : '#8e8e93',
                        borderBottom: activeGroupTab === tab.id ? '2px solid #007aff' : '2px solid transparent',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ã¢â€â‚¬Ã¢â€â‚¬ ConteÃƒÂºdo das Abas Ã¢â€â‚¬Ã¢â€â‚¬ */}
              <div className="min-h-[200px]">
                {activeGroupTab === 'members' && (
                  <div className="divide-y divide-gray-100">
                    {communityMembers.length > 0 ? communityMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                        <div
                          className="w-[42px] h-[42px] rounded-full shrink-0 flex items-center justify-center text-white text-[13px] font-semibold"
                          style={{ backgroundColor: getUserColor(member.id) }}
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[15px] font-medium text-[#111] truncate">{member.name}</span>
                          {member.phone !== member.name && member.phone !== 'Telefone desconhecido' && (
                            <span className="text-[12px] truncate" style={{ color: '#8e8e93' }}>{member.phone}</span>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p className="px-4 py-6 text-center text-[13px]" style={{ color: '#8e8e93' }}>
                        Ainda nÃ£o hÃ¡ membros com mensagens no grupo
                      </p>
                    )}
                  </div>
                )}

                {activeGroupTab === 'media' && (
                  sharedPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0.5">
                      {sharedPhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => handleOpenZoomedImage(photo.url)}
                          className="aspect-square cursor-pointer overflow-hidden bg-gray-100 active:opacity-80"
                          aria-label="Abrir foto partilhada"
                        >
                          <img
                            src={photo.url}
                            alt="Foto partilhada no grupo"
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center pt-16 pb-8">
                      <span className="text-[14px]" style={{ color: '#8e8e93' }}>{t('group.no_shared_photos')}</span>
                    </div>
                  )
                )}

                {activeGroupTab === 'files' && (
                  sharedFiles.length > 0 ? (
                    <div className="divide-y divide-gray-100 bg-white">
                      {sharedFiles.map((file) => (
                        file.type === 'application/pdf' ? (
                          <div key={file.id} className="flex items-center gap-3 px-4 py-3 text-left">
                            <PdfDownloadCard url={file.url} name={file.name} sizeBytes={file.sizeBytes} compact />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[14px] font-medium text-[#111]">{file.name}</span>
                              <span className="truncate text-[12px]" style={{ color: '#8e8e93' }}>
                                Ficheiro: {formatFileSize(file.sizeBytes)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <a
                            key={file.id}
                            href={file.url}
                            download={file.url.startsWith('data:') ? file.name : undefined}
                            target={file.url.startsWith('data:') ? undefined : '_blank'}
                            rel={file.url.startsWith('data:') ? undefined : 'noopener noreferrer'}
                            className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                          >
                            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#007aff20' }}>
                              <FileText className="h-5 w-5" style={{ color: '#007aff' }} />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[14px] font-medium text-[#111]">{file.name}</span>
                              <span className="truncate text-[12px]" style={{ color: '#8e8e93' }}>
                                {file.type || 'Ficheiro partilhado'}
                              </span>
                            </div>
                            <Download className="h-4 w-4 shrink-0" style={{ color: '#8e8e93' }} />
                          </a>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center pt-16 pb-8">
                      <span className="text-[14px]" style={{ color: '#8e8e93' }}>{t('group.no_shared_files')}</span>
                    </div>
                  )
                )}

                {activeGroupTab === 'links' && (
                  sharedLinks.length > 0 ? (
                    <div className="divide-y divide-gray-100 bg-white">
                      {sharedLinks.map((link) => (
                        <a
                          key={`${link.id}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenAuthorizedLink(e, link.url);
                          }}
                          className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#007aff20' }}>
                            <Link2 className="h-5 w-5" style={{ color: '#007aff' }} />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[14px]" style={{ color: '#007aff' }}>{link.label}</span>
                            <span className="truncate text-[12px]" style={{ color: '#8e8e93' }}>{link.message || link.url}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center pt-16 pb-8">
                      <span className="text-[14px]" style={{ color: '#8e8e93' }}>{t('group.no_shared_links')}</span>
                    </div>
                  )
                )}
              </div>

            </div>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ FAB azul canto inferior direito Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <button
              type="button"
              onClick={() => showToast('Apenas administradores podem adicionar membros', 'info')}
              className="absolute bottom-6 right-6 w-[56px] h-[56px] rounded-full shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: '#007aff' }}
              aria-label="Adicionar membro"
            >
              <UserPlus className="w-6 h-6 text-white stroke-[2]" />
            </button>

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex h-[100dvh] w-screen items-center justify-center overflow-hidden" 
            onClick={() => setZoomedImage(null)}
          >
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
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button 
                type="button"
                className="text-white p-2 hover:bg-white/10 rounded-full cursor-pointer flex items-center justify-center transition-colors"
                onClick={(e) => handleDownloadImage(zoomedImage, e)}
                title="Baixar imagem"
              >
                <Download className="w-6 h-6 stroke-[2]" />
              </button>
              <button 
                type="button"
                className="text-white hover:text-[#FE384F] p-2 hover:bg-white/10 rounded-full cursor-pointer flex items-center justify-center transition-colors"
                onClick={() => setZoomedImage(null)}
                title="Fechar"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ CONTEXT MENU Ã¢â‚¬â€ TOPO DA TELA (slide-down) Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[200]"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          onClick={closeContextMenu}
        >
          <div
            className="fixed w-[184px] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto bg-white dark:bg-[#1e1e1e] select-none border border-black/10 dark:border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              borderRadius: '12px',
              touchAction: 'manipulation',
            }}
          >
            {/* â”€â”€ Barra de ReaÃ§Ãµes â”€â”€ */}
            <div className="flex w-fit items-center gap-0.5 px-1.5 py-1 border-b border-gray-100 dark:border-white/10">
              {COMMUNITY_QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleToggleReaction(contextMenu.message.id, emoji);
                    showToast(`ReaÃ§Ã£o ${emoji} adicionada!`, 'success');
                    closeContextMenu();
                  }}
                  className="w-7 h-7 shrink-0 flex items-center justify-center text-[18px] leading-none active:scale-125 transition-transform rounded-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ touchAction: 'manipulation' }}
                  title={`Reagir com ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ Lista de AÃƒÂ§ÃƒÂµes Verticais Ã¢â€â‚¬Ã¢â€â‚¬ */}
            {menuActions.map((action, idx) => (
              <React.Fragment key={action.label}>
                <button
                  type="button"
                  onClick={action.onClick}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] active:bg-gray-100 dark:active:bg-[#333] transition-colors cursor-pointer text-left"
                  style={{ touchAction: 'manipulation' }}
                >
                  <span
                    className="w-[26px] h-[26px] shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      color: action.color,
                      backgroundColor: action.label === 'Apagar'
                        ? 'rgba(229, 62, 62, 0.10)'
                        : action.label === 'Responder'
                          ? 'rgba(36, 129, 204, 0.10)'
                          : 'rgba(120, 130, 140, 0.10)',
                    }}
                  >
                    <action.icon className="w-[14px] h-[14px]" strokeWidth={2.2} />
                  </span>
                  <div>
                    <span
                      className="text-[11px] font-medium block leading-tight text-gray-900 dark:text-gray-100"
                      style={{ color: action.color === '#e53e3e' ? '#e53e3e' : undefined }}
                    >
                      {action.label}
                    </span>
                    {action.subLabel && (
                      <span className="text-[9px] text-gray-400 block mt-0.5">{action.subLabel}</span>
                    )}
                  </div>
                </button>
                {idx < menuActions.length - 1 && (
                  <div className="h-px bg-gray-100 dark:bg-[#2e2e2e] ml-[38px]" />
                )}
              </React.Fragment>
            ))}

          </div>
        </div>
      )}

      </div>
    </div>
  );
}


