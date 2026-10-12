import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Mic,
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
  Link2
} from 'lucide-react';
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import ChatsList from "./ChatsList";

const FORBIDDEN_WORDS = Array.from(new Set([
  "burla", "burlas", "fraude", "fraudes", "scam", "scams", "golpe", "golpes", 
  "ladrÃ£o", "ladrao", "ladrÃµes", "ladroes", "roubo", "roubos", "bosta", "bostas", 
  "merda", "merdas", "caralho", "caralhos", "foda", "fodas", "fodase", "foda-se", 
  "porra", "porras", "puta", "putas", "puta que pariu", "filho da puta", "fdp", 
  "cabrao", "cabrÃ£o", "cabroes", "cabrÃµes", "corno", "cornos", "vagabundo", "vagabundos", 
  "desgraÃ§ado", "desgracado", "desgraÃ§ados", "animal", "animais", "idiota", "idiotas", 
  "imbecil", "imbecis", "otario", "otÃ¡rio", "otarios", "otÃ¡rios", "retardado", "retardados", 
  "estupido", "estÃºpido", "estupidos", "estÃºpidos", "palhaÃ§o", "palhaco", "palhaÃ§os", "palhacos", 
  "lixo", "lixos", "nojento", "nojentos", "maldito", "malditos", "cÃ£o", "cao", "macaco", "macacos", 
  "burro", "burros", "cala boca", "vai se ferrar", "vai te ferrar", "vai morrer", 
  "sexo", "nude", "nudes", "porn", "porno", "pornografia", "pÃªnis", "penis", 
  "piroca", "pirocas", "cona", "conas", "vagina", "buceta", "bucetas", "cu", "cus", 
  "rabeta", "mamar", "chupar", "mata", "morrer", "suicida", "suicidio", "terrorista", "nazista", "racista", 
  "vou denunciar", "vou processar", "processo", "crime", "polÃ­cia", "policia", 
  "tribunal", "interpol", "cadeia", "prisÃ£o", "prisao", "fbi", "investigaÃ§Ã£o", "investigacao", 
  "viado", "viados", "gayzinho", "bicha", "bichas", "boiola", "sapatÃ£o", "sapatao", 
  "golpista", "golpistas", "burlador", "burladores", "fraudador", "fraudadores", 
  "scammer", "scammers", "pirÃ¢mide", "piramide", "esquema ponzi", "ponzi", 
  "roubaram", "roubaste", "roubado", "roubando", "empresa falsa", "site falso", 
  "aplicativo falso", "app falso", "fake", "farsa", "enganador", "enganadora", 
  "trapaceiro", "vigarista", "171", "mafioso", "mÃ¡fia", "mafia", 
  "admin ladrÃ£o", "admin ladrao", "suporte lixo", "suporte inÃºtil", "suporte inutil", 
  "admin inÃºtil", "admin inutil", "adm corrupto", "admin corrupto", "moderador corrupto", 
  "staff lixo", "staff incompetente", "empresa corrupta", "empresa de ladrÃµes", "empresa de ladroes", 
  "dono ladrÃ£o", "dono ladrao", "vocÃªs roubam", "voces roubam", "estÃ£o roubando", "estao roubando", 
  "vocÃªs sÃ£o burlÃµes", "voces sao burloes", 
  "nÃ£o paga", "nao paga", "nÃ£o pagam", "nao pagam", "perdi dinheiro", "perdi tudo", 
  "nÃ£o recebi", "nao recebi", "sumiram com dinheiro", "bloquearam saque", "nÃ£o consigo sacar", 
  "nao consigo sacar", "site caiu", "empresa faliu", "empresa vai fechar", "vai fechar", 
  "quebrou", "falida", "falido", "sistema roubando", "dinheiro preso", "nÃ£o vale nada", "nao vale nada", 
  "ganha dinheiro rapido", "dinheiro facil", "hack", "hacker", "clonar", 
  "cartÃ£o roubado", "cartao roubado", "bitcoin gratis", "investimento falso", 
  "entra no meu link", "usa meu link", "me chama no privado", "grupo fake", "grupo falso", 
  "tenho hack", "hack saque", "hack sistema", "bug de saque", "mÃ©todo secreto", "metodo secreto", 
  "ganhar sem investir", "dinheiro fÃ¡cil", "lucro garantido", "100% garantido", 
  "nÃ£o confiem", "nao confiem", "nÃ£o invistam", "nao invistam", "isso Ã© golpe", "isso e golpe", 
  "empresa scam", "site scam", "app scam", "plataforma scam", "plataforma falsa", "empresa fake", 
  "saque falso", "pagamento falso"
]));

const ESCAPED_FORBIDDEN = FORBIDDEN_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const FORBIDDEN_REGEX = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${ESCAPED_FORBIDDEN.join('|')})(?:[^\\p{L}\\p{N}]|$)`, 'iu');

const CONTEXT_GROUPS: Record<string, { path: string, keywords: string[] }> = {
  TelegramBusiness: { path: "/org", keywords: ["telegram business", "negÃ³cios", "conversas", "chats", "painel", "inÃ­cio", "inicio"] },
  Withdraw: { path: "/carteira", keywords: ["saque", "sacar", "retirada", "retirar", "levantamento", "levantar dinheiro", "withdraw", "withdrawal", "retrait", "retirer"] },
  Recharge: { path: "/sand-pay", keywords: ["recarga", "recarregar", "depÃ³sito", "depositar", "recharge"] },
  Invite: { path: "/convite", keywords: ["convite", "convidar", "amigo", "afiliado", "indicar"] },
  Support: { path: "/org", keywords: ["suporte", "ajuda", "atendimento", "help"] },
  Operations: { path: "/operacoes", keywords: ["operaÃ§Ãµes", "operacoes", "trabalho", "tarefa", "tarefas"] },
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

const MAX_TRANSLATION_CACHE = 250;
const translationCache = new Map<string, string>();
const translationQueue: (() => Promise<void>)[] = [];
let isTranslating = false;

const processTranslationQueue = async () => {
  if (isTranslating) return;
  isTranslating = true;
  while (translationQueue.length > 0) {
    const task = translationQueue.shift();
    if (task) {
      await task();
      await new Promise(r => setTimeout(r, 60));
    }
  }
  isTranslating = false;
};

const getCachedTranslation = (key: string): string | undefined => {
  if (!translationCache.has(key)) return undefined;
  const val = translationCache.get(key)!;
  translationCache.delete(key);
  translationCache.set(key, val);
  return val;
};

const setCachedTranslation = (key: string, val: string) => {
  if (translationCache.size >= MAX_TRANSLATION_CACHE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, val);
};

const translateTextAPI = (text: string, lang: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!text || text.trim() === '' || lang === 'pt') return resolve(text);
    const cacheKey = `${lang}:${text}`;
    const cached = getCachedTranslation(cacheKey);
    if (cached) return resolve(cached);
    
    translationQueue.push(async () => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json && json[0]) {
          const result = json[0].map((item: any) => item[0]).join('');
          setCachedTranslation(cacheKey, result);
          resolve(result);
        } else resolve(text);
      } catch {
        resolve(text);
      }
    });
    processTranslationQueue();
  });
};

const TranslatedMessage = React.memo(({ text, language, renderFormatted }: { text: string, language: string, renderFormatted: (t: string) => React.ReactNode }) => {
  const [translated, setTranslated] = useState<string>(text);

  useEffect(() => {
    let isMounted = true;
    if (!text || language === 'pt') {
      setTranslated(text);
      return;
    }
    const cached = getCachedTranslation(`${language}:${text}`);
    if (cached) {
      setTranslated(cached);
      return;
    }
    translateTextAPI(text, language).then(result => { 
      if (isMounted) setTranslated(result); 
    });
    return () => { isMounted = false; };
  }, [text, language]);

  return <>{renderFormatted(translated)}</>;
});
TranslatedMessage.displayName = "TranslatedMessage";

const USER_COLORS = [
  "#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9"
];

function getUserColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

const formatSenderPhone = (p?: string | null) => {
  if (!p || p === "Membro") return 'Membro';
  const clean = p.replace(/^\+?244\s*/, '').trim();
  if (/^\d{9}$/.test(clean)) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return clean || 'Contacto';
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

const phoneCache: Record<string, string> = {};

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
    name: 'Lauren Gabriella ðŸ¥°',
    status: 'visto Ã s 20:31',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
  },
  {
    id: 'm3',
    name: 'Brilson EdlÃ©zio',
    status: 'visto Ã s 20:13',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  },
  {
    id: 'm4',
    name: 'ID 4700',
    badge: 'Dono',
    badgeType: 'owner',
    status: 'visto Ã s 20:13',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop'
  },
  {
    id: 'm5',
    name: 'Chrina Manual',
    status: 'visto Ã s 19:57',
    avatar: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=100&h=100&fit=crop'
  },
  {
    id: 'm6',
    name: 'PATRICIA',
    status: 'visto Ã s 19:42',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: 'm7',
    name: 'Carlos Manuel',
    status: 'visto Ã s 19:15',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop'
  },
  {
    id: 'm8',
    name: 'Mariana Santos',
    status: 'visto Ã s 18:50',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop'
  },
  {
    id: 'm9',
    name: 'JoÃ£o Pedro',
    status: 'visto Ã s 18:22',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop'
  },
  {
    id: 'm10',
    name: 'Nelson Mandela Neto',
    status: 'visto Ã s 17:40',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop'
  }
];

const COMMUNITY_QUICK_REACTIONS = ['👍', '❤️', '🔥', '🥰', '👏', '😂'];

type GroupTab = 'members' | 'media' | 'files' | 'links';
const GROUP_TABS: { id: GroupTab; label: string }[] = [
  { id: 'members', label: 'Membros' },
  { id: 'media', label: 'Mídia' },
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

interface MessageItemProps {
  message: any;
  isMe: boolean;
  displayName: string;
  authorColor: string;
  showDate: boolean;
  dateLabel: string;
  timeFormatted: string;
  language: string;
  isSelectedInContextMenu: boolean;
  onStartLongPress: (m: any, isMe: boolean, clientX: number, clientY: number) => void;
  onCancelLongPress: () => void;
  onCheckMoveCancel: (clientX: number, clientY: number) => void;
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
  authorColor,
  showDate,
  dateLabel,
  timeFormatted,
  language,
  isSelectedInContextMenu,
  onStartLongPress,
  onCancelLongPress,
  onCheckMoveCancel,
  onContextMenu,
  onClickBubble,
  onToggleReaction,
  onOpenZoomedImage,
  renderFormattedMessage
}: MessageItemProps) => {
  const parsedData: any = (m.detalhes && typeof m.detalhes === 'object') ? m.detalhes : {};
  const reply = parsedData.reply;
  const reactions = parsedData.reacoes || {};
  const isEdited = Boolean(parsedData.editado);

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
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0 mt-[2px] shadow-xs overflow-hidden select-none"
            style={{ backgroundColor: authorColor }}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* ── Mensagem só com imagem (sem balão) ── */}
        {parsedData.imagem_url && !m.mensagem?.trim() ? (
          <div
            className="relative cursor-pointer rounded-[18px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.18)] max-w-[72vw] sm:max-w-[320px]"
            onTouchStart={(e) => {
              const t = e.touches[0];
              onStartLongPress(m, isMe, t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              onCheckMoveCancel(t.clientX, t.clientY);
            }}
            onTouchEnd={onCancelLongPress}
            onTouchCancel={onCancelLongPress}
            onMouseDown={(e) => {
              if (e.button === 0) {
                onStartLongPress(m, isMe, e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              onCheckMoveCancel(e.clientX, e.clientY);
            }}
            onMouseUp={onCancelLongPress}
            onMouseLeave={onCancelLongPress}
            onContextMenu={(e) => onContextMenu(e, m, isMe)}
            onClick={onClickBubble}
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
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-1.5 right-2 flex items-center gap-1 bg-black/40 rounded-full px-1.5 py-0.5 select-none">
              {isEdited && (
                <span className="text-[9.5px] font-normal text-white/85 select-none">editada</span>
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
                Mensagem não enviada
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
          /* ── Mensagem normal (texto ± imagem) ── */
          <div
            onTouchStart={(e) => {
              const t = e.touches[0];
              onStartLongPress(m, isMe, t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              onCheckMoveCancel(t.clientX, t.clientY);
            }}
            onTouchEnd={onCancelLongPress}
            onTouchCancel={onCancelLongPress}
            onMouseDown={(e) => {
              if (e.button === 0) {
                onStartLongPress(m, isMe, e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              onCheckMoveCancel(e.clientX, e.clientY);
            }}
            onMouseUp={onCancelLongPress}
            onMouseLeave={onCancelLongPress}
            onContextMenu={(e) => onContextMenu(e, m, isMe)}
            onClick={onClickBubble}
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
                className="text-[13px] font-medium mb-[2px] cursor-pointer truncate"
                style={{ color: authorColor }}
              >
                {displayName}
              </p>
            )}

            {reply && (
              <div className={cn(
                "rounded-[4px] px-2 py-1 mb-1.5 text-[13px] border-l-[3px] bg-black/5 overflow-hidden",
                isMe ? "border-[#4fae4e] text-[#444444]" : "border-[#2b82c9] text-[#555555]"
              )}>
                <p className="font-medium text-[13px] text-[#2b82c9] truncate leading-tight">{reply.sender}</p>
                <p className="truncate text-[13px] text-[#666666] leading-tight mt-0.5">{reply.text || "📷 Foto"}</p>
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

            <div className="relative leading-[1.3]">
              <span className="text-[16px] whitespace-pre-wrap break-words font-normal">
                <TranslatedMessage text={m.mensagem} language={language} renderFormatted={renderFormattedMessage} />
              </span>
              
              <span className="inline-block h-[1px]" style={{ width: isEdited ? (isMe ? '75px' : '60px') : (isMe ? '56px' : '42px') }}></span>

              <div className="absolute bottom-[-1px] right-0 flex items-center gap-[2px] select-none text-[12px]" style={{ color: isMe ? '#55864e' : '#8e8e93' }}>
                {isEdited && (
                  <span className="opacity-80 mr-[2px]">editada</span>
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
                  Mensagem não enviada
                </p>
              )}
            </div>

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
  const { language } = useLanguage();
  const { statusText } = useNetworkStatus();

  const [publicMessages, setPublicMessages] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);
  const [publicInput, setPublicInput] = useState("");
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activeGroupTab, setActiveGroupTab] = useState<GroupTab>('members');
  const [isGroupMuted, setIsGroupMuted] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const [contextMenu, setContextMenu] = useState<{ message: any; isMe: boolean } | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = useCallback((m: any, isMe: boolean, clientX: number, clientY: number) => {
    isLongPressTriggeredRef.current = false;
    pressStartPosRef.current = { x: clientX, y: clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
        try { window.navigator.vibrate(40); } catch {}
      }
      setContextMenu({ message: m, isMe });
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
    setContextMenu({ message: m, isMe });
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
    if (editingMessage?.id === msgId) {
      setEditingMessage(null);
      setPublicInput("");
    }
    try {
      await supabase.from('chat_gruop').delete().eq('id', msgId);
    } catch {}
    setPublicMessages(prev => prev.filter(m => m.id !== msgId));
    showToast('Mensagem apagada', 'info');
    closeContextMenu();
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // IDs de mensagens com reaÃ§Ãµes em voo (impede o realtime de sobrescrever estado otimista)
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
            telefone: phoneCache[m.uid_emissor] || "Telefone Desconhecido",
            nome_exibicao: phoneCache[m.uid_emissor] || "Membro"
          }
        }));

        const sorted = dataWithPhones.reverse();
        setPublicMessages(prev => {
          const withoutTemp = prev.filter(m => {
            if (typeof m.id === 'number' && m.id > 1000000000000) {
              return !sorted.some((s: any) => s.uid_emissor === m.uid_emissor && s.mensagem === m.mensagem);
            }
            return true;
          });

          const msgMap = new Map();
          withoutTemp.forEach(m => msgMap.set(m.id, m));
          sorted.forEach((m: any) => msgMap.set(m.id, m));
          const result = Array.from(msgMap.values()).sort((a, b) =>
            new Date(a.data_registrada).getTime() - new Date(b.data_registrada).getTime()
          );

          try {
            localStorage.setItem('community_chat_cache', JSON.stringify(result.slice(-50)));
          } catch {}

          return result;
        });

        if (isInitial) scrollToBottom("auto");

        // 2. Buscar perfis novos em background de forma não bloqueante
        const uncachedIds = Array.from(new Set(data.map((m: any) => m.uid_emissor).filter((id: string) => id && !phoneCache[id])));
        if (uncachedIds.length > 0) {
          (async () => {
            try {
              const { data: profiles } = await supabase
                .from('sys_t500')
                .select('id, telefone, nome_exibicao')
                .in('id', uncachedIds);
              if (profiles && profiles.length > 0) {
                profiles.forEach((p: any) => {
                  phoneCache[p.id] = p.nome_exibicao || p.telefone || "Telefone Desconhecido";
                });
                setPublicMessages(prev => prev.map(m => {
                  if (phoneCache[m.uid_emissor] && m.perfil?.nome_exibicao !== phoneCache[m.uid_emissor]) {
                    return {
                      ...m,
                      perfil: {
                        telefone: phoneCache[m.uid_emissor],
                        nome_exibicao: phoneCache[m.uid_emissor]
                      }
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
      console.error("Não foi possível carregar mensagens:", err);
    } finally {
      isFetchingRef.current = false;
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carregar cache local INSTANTANEAMENTE (0ms)
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
    } catch {}

    fetchMessages(true);

    const handleSync = () => {
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
        console.error("Não foi possível carregar o total de utilizadores:", error);
        if (isActive) showToast("Não foi possível carregar o total de membros.", "error");
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
          console.error("Não foi possível acompanhar alterações no total de utilizadores:", status);
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
              console.error("Não foi possível atualizar a presença online:", trackStatus);
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
          console.error("Não foi possível transmitir a digitação do grupo para a lista:", status);
        }
      });

    const channel = supabase.channel("tg_community_chat_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_gruop" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setPublicMessages(prev => prev.filter(m => m.id !== payload.old.id));
          return;
        }
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const data: any = payload.new;
          if (data && data.id) { 
            let tel = phoneCache[data.uid_emissor] || null;
            if (!tel && data.uid_emissor) {
              supabase
                .from('sys_t500')
                .select('telefone, nome_exibicao')
                .eq('id', data.uid_emissor)
                .maybeSingle()
                .then(({ data: prof }) => {
                  if (prof) {
                    const resolvedTel = prof.nome_exibicao || prof.telefone || "Telefone Desconhecido";
                    phoneCache[data.uid_emissor] = resolvedTel;
                    setPublicMessages(prev => prev.map(m => 
                      m.uid_emissor === data.uid_emissor && m.perfil?.nome_exibicao !== resolvedTel
                        ? { ...m, perfil: { telefone: resolvedTel, nome_exibicao: resolvedTel } }
                        : m
                    ));
                  }
                });
            }
            const dataWithPhone = { 
              ...data, 
              perfil: { 
                telefone: tel || "Telefone Desconhecido",
                nome_exibicao: tel || "Membro"
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
    if (now - lastTypingBroadcastRef.current > 1800 && typingChannelRef.current) {
      lastTypingBroadcastRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          name: phoneCache[user.id] || user.user_metadata?.nome_exibicao || user.phone || "Membro"
        }
      });
      groupListTypingChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          name: phoneCache[user.id] || user.user_metadata?.nome_exibicao || user.phone || "Membro",
          targetId: 'community'
        }
      });
    }
  };

  const validateMessage = (text: string) => {
    if (text.length > 2000) return "A mensagem é muito longa.";
    if (FORBIDDEN_REGEX.test(text)) return "Por favor, evite termos ofensivos.";
    const matches = text.match(URL_REGEX);
    if (matches) {
      if (matches.some(m => !isAllowedUrl(m))) {
        return "Não são permitidos links externos.";
      }
    }
    return null;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("Máximo 10MB.", "error"); return; }
    try {
      const compressed = await compressImage(file, 1280, 1280, 0.75);
      setImagePreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSend = async () => {
    if (!user || (!publicInput.trim() && !imagePreview)) return;
    if (publicInput.trim()) {
      const err = validateMessage(publicInput.trim());
      if (err) { showToast(err, "error"); return; }
    }
    const tempMsg = publicInput.trim();

    // â”€â”€ Fluxo de EdiÃ§Ã£o de Mensagem Existente â”€â”€
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

      // AtualizaÃ§Ã£o otimista local imediata
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
        console.error('[CommunityChat] Falha na ediÃ§Ã£o:', err);
        showToast('Erro ao atualizar a mensagem', 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

    const tempImg = imagePreview;
    const tempReply = replyTo;
    const detalhes: Record<string, any> = {};
    if (tempImg) { detalhes.imagem_url = tempImg; detalhes.tipo_midia = 'imagem'; }
    if (tempReply) { detalhes.resposta_para_id = tempReply.id; detalhes.reply = { id: tempReply.id, text: tempReply.mensagem, sender: tempReply.perfil?.nome_exibicao || tempReply.perfil?.telefone || '' }; }

    setPublicInput("");
    setIsComposerExpanded(false);
    setImagePreview(null);
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
        setPublicMessages(prev => prev.map(m => m.id === tempId ? {
          ...insertedMsg,
          perfil: { 
            telefone: phoneCache[user.id] || "Eu",
            nome_exibicao: phoneCache[user.id] || "Eu"
          },
          status: 'sent' as const
        } : m));
      }
      console.log('[CommunityChat] Mensagem inserida com sucesso');
      scrollToBottom();
    } catch (err: any) { 
      console.error("Ops! mensagem nÃ£o enviada", err);
      setPublicMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' as const } : m));
      showToast('Mensagem não enviada', 'error'); 
    } finally { 
      setIsSending(false); 
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
          if (error) console.error('[CommunityChat] Erro ao salvar reação:', error);
        } catch (err: any) {
          console.error('[CommunityChat] Falha ao persistir reação:', err);
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
      showToast('Download concluÃ­do!', 'success');
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

  // â”€â”€ AÃ§Ãµes do Menu de Contexto Telegram â”€â”€
  const menuActions = contextMenu ? [
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
      color: '#e53e3e',
      subLabel: 'AutoexcluirÃ¡ em 31 dias'
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
        type: file.tipo_mime || file.mime_type || file.content_type || ''
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
          className="flex items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 max-w-[65%] cursor-pointer active:scale-[0.98] transition-transform pointer-events-auto"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
            <img src="/logo-tb.jpg" alt="Telegram" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-white rounded-full flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-[#25D366] rounded-full flex items-center justify-center">
                <span className="text-[6px] font-bold text-white leading-none">1$</span>
              </span>
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-medium text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
              Telegram Empresa
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
          aria-label="Mais informaÃ§Ãµes"
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
          const displayName = isMe 
            ? "Eu" 
            : (m.perfil?.nome_exibicao || formatSenderPhone(m.perfil?.telefone));
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
              authorColor={authorColor}
              showDate={showDate}
              dateLabel={currDate}
              timeFormatted={formatTime(m.data_registrada)}
              language={language}
              isSelectedInContextMenu={contextMenu?.message?.id === m.id}
              onStartLongPress={startLongPress}
              onCancelLongPress={cancelLongPress}
              onCheckMoveCancel={checkMoveCancel}
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
                  title="Cancelar ediÃ§Ã£o"
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
                    A responder a {replyTo.perfil?.nome_exibicao || formatSenderPhone(replyTo.perfil?.telefone)}
                  </p>
                  <p className="text-[11px] text-[#777777] truncate italic">
                    <TranslatedMessage text={replyTo.mensagem} language={language} renderFormatted={(t: string) => t || 'Foto'} />
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

            <div className={`flex-1 bg-white ${isComposerExpanded ? 'rounded-[24px] items-end' : 'rounded-full items-center'} shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex px-3.5 py-1.5 min-h-[46px] border border-gray-100/80`}>
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

              <textarea
                ref={inputRef}
                value={publicInput}
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
                className="w-full min-h-[24px] px-2 py-1.5 text-[15px] bg-transparent resize-none overflow-y-hidden outline-none max-h-[120px] text-black placeholder:text-gray-400 font-normal leading-snug"
                rows={1}
              />

              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0 rotate-[-45deg]"
                title="Anexar foto"
              >
                <Paperclip className="w-5 h-5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0"
                title="Tirar foto ou escolher da galeria"
                aria-label="Tirar foto ou escolher da galeria"
              >
                <Camera className="w-5 h-5 stroke-[1.8]" />
              </button>
            </div>

            <button 
              type="button"
              onClick={handleSend}
              disabled={isSending}
              style={{ borderRadius: '9999px' }}
              className="w-[46px] h-[46px] !rounded-full rounded-full bg-[#2481cc] hover:bg-[#1f72b5] text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_10px_rgba(36,129,204,0.4)] cursor-pointer"
              title={editingMessage ? "Salvar alteraÃ§Ãµes" : "Enviar"}
            >
              {editingMessage ? (
                <Check className="w-5 h-5 text-white stroke-[2.5]" />
              ) : (publicInput.trim() || imagePreview) ? (
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
            {/* â”€â”€ Header: Ã— Group Info [icon] â”€â”€ */}
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

            {/* â”€â”€ Scrollable content â”€â”€ */}
            <div className="flex-1 overflow-y-auto">

              {/* â”€â”€ Avatar + Nome + Membros â”€â”€ */}
              <div className="flex flex-col items-center pt-6 pb-5 px-4">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden mb-4">
                  <img src="/logo-tb.jpg" alt="Telegram" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-[18px] font-bold text-[#111] text-center leading-tight">
                  Telegram Empresa
                </h1>
                <p className="text-[13px] mt-1" style={{ color: '#8e8e93' }}>
                  {registeredUserCount === null
                    ? '— members'
                    : `${registeredUserCount} ${registeredUserCount === 1 ? 'member' : 'members'}`}
                </p>
              </div>

              {/* â”€â”€ Card branco: Link + Notifications â”€â”€ */}
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
                  <span className="flex-1 text-[14px] text-[#111]">Notifications</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupMuted(!isGroupMuted);
                      showToast(isGroupMuted ? 'Notifications on' : 'Notifications off', 'info');
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

              {/* â”€â”€ Abas: Members | Media | Files | Links â”€â”€ */}
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

              {/* â”€â”€ ConteÃºdo das Abas â”€â”€ */}
              <div className="min-h-[200px]">
                {activeGroupTab === 'members' && (
                  <div className="divide-y divide-gray-100">
                    {[
                      { name: 'Pavel Durov', role: 'Founder', avatar: '/pavel_durov.jpg' },
                      { name: 'Telegram Business', role: 'Administrator', avatar: '/logo-tb.jpg' },
                    ].map((member) => (
                      <div key={member.name} className="flex items-center gap-3 px-4 py-3 bg-white">
                        <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-gray-200">
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/logo-tb.jpg'; }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[15px] font-medium text-[#111] truncate">{member.name}</span>
                          <span className="text-[12px]" style={{ color: '#8e8e93' }}>{member.role}</span>
                        </div>
                      </div>
                    ))}
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
                      <span className="text-[14px]" style={{ color: '#8e8e93' }}>Ainda não há fotos partilhadas</span>
                    </div>
                  )
                )}

                {activeGroupTab === 'files' && (
                  sharedFiles.length > 0 ? (
                    <div className="divide-y divide-gray-100 bg-white">
                      {sharedFiles.map((file) => (
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
                            <span className="truncate text-[12px]" style={{ color: '#8e8e93' }}>{file.type || 'Ficheiro partilhado'}</span>
                          </div>
                          <Download className="h-4 w-4 shrink-0" style={{ color: '#8e8e93' }} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center pt-16 pb-8">
                      <span className="text-[14px]" style={{ color: '#8e8e93' }}>Ainda não há ficheiros partilhados</span>
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
                      <span className="text-[14px]" style={{ color: '#8e8e93' }}>Ainda não há links partilhados</span>
                    </div>
                  )
                )}
              </div>

            </div>

            {/* â”€â”€ FAB azul canto inferior direito â”€â”€ */}
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

      {/* â”€â”€ CONTEXT MENU â€” TOPO DA TELA (slide-down) â”€â”€ */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[200] bg-black/40"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          onClick={closeContextMenu}
        >
          {/* Painel que desce do topo */}
          <div
            className="absolute top-0 left-0 right-0 bg-white dark:bg-[#1e1e1e] select-none shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideDownMenu 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
              touchAction: 'manipulation',
              borderBottomLeftRadius: '20px',
              borderBottomRightRadius: '20px',
            }}
          >
            {/* ── Barra de Reações ── */}
            <div className="flex items-center justify-around px-3 py-3 border-b border-gray-100 dark:border-white/8">
              {COMMUNITY_QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleToggleReaction(contextMenu.message.id, emoji);
                    showToast(`Reação ${emoji} adicionada!`, 'success');
                    closeContextMenu();
                  }}
                  className="w-10 h-10 flex items-center justify-center text-[26px] leading-none active:scale-125 transition-transform rounded-full cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                  title={`Reagir com ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* â”€â”€ Lista de AÃ§Ãµes Verticais â”€â”€ */}
            {menuActions.map((action, idx) => (
              <React.Fragment key={action.label}>
                <button
                  type="button"
                  onClick={action.onClick}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] active:bg-gray-100 dark:active:bg-[#333] transition-colors cursor-pointer text-left"
                  style={{ touchAction: 'manipulation' }}
                >
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
                </button>
                {idx < menuActions.length - 1 && (
                  <div className="h-px bg-gray-100 dark:bg-[#2e2e2e] mx-5" />
                )}
              </React.Fragment>
            ))}

            {/* â”€â”€ Fechar / handle â”€â”€ */}
            <div className="flex justify-center py-3">
              <button
                type="button"
                onClick={closeContextMenu}
                className="flex items-center gap-2 text-[13px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer select-none"
                style={{ touchAction: 'manipulation' }}
              >
                <X className="w-4 h-4" />
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ AnimaÃ§Ãµes CSS injetadas â”€â”€ */}
      <style>{`
        @keyframes slideDownMenu {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0);     }
        }
      `}</style>
      </div>
    </div>
  );
}
