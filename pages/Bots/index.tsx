import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MoreVertical,
  Send,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  Zap,
  RotateCcw
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { useToast } from "../../components/Toast";
import RedeemCouponForm from "../../components/RedeemCouponForm";
import { formatCurrency } from "../../lib/currency";
import { useLanguage } from "../../contexts/LanguageContext";
import AutoTranslatedText from "../../components/AutoTranslatedText";
import { clearLegacyAssistantChatHistory } from "../../lib/legacyAssistantChatHistory";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { useAuth } from "../../contexts/AuthContext";
import { recordChatActivity } from "../../lib/chatActivity";

/* ─── SVG Doodle Background (Telegram BotFather style) ─────────── */
const DOODLE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`;

/* ─── Interfaces ─────────────────────────────────────────── */
export interface ProductItem {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  renda_diaria: number;
  duracao_dias: number;
  limite_compra?: number;
  imagem_url?: string;
  size?: string;
}

export interface PurchasedBotItem {
  id: string;
  preco_pago: number;
  renda_diaria: number;
  data_inicio: string;
  data_fim: string;
  dias_restantes: number;
  ativo: boolean;
  produto_nome: string;
  produto_imagem?: string;
  storage_size?: string;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  time: string;
  text?: string;
  type: "welcome" | "text" | "catalog" | "my_bots" | "single_bot" | "purchase_success";
  payload?: any;
}

/* ─── Lista de Comandos Válidos ─── */
const VALID_COMMANDS = new Set([
  "/start", "/inicio", "/início", "/help", "/ajuda", "/menu",
  "/bots", "/catalogo", "/catálogo", "/comprar", "/loja", "/produtos",
  "/meusbots", "/mybots", "/ativos", "/compras", "/minhascompras",
  "/saldo", "/carteira", "/rendas", "/historico", "/histórico",
  "/limites", "/limite", "/limpar", "/reset", "/clear",
  "/cupons", "/cupon", "/coupon", "/codigo", "/código", "/senha"
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd) || cmd.startsWith("/comprar_");
}

/* ─── Helpers de Tempo ───────────────────────────────────── */
function getCurrentTime(): string {
  return new Date().toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
}

function getSecondsUntilNextCredit(dataInicio: string): number {
  try {
    const start = new Date(dataInicio);
    const now = new Date();
    const next = new Date();
    next.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  } catch {
    return 86400;
  }
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function displayBotName(name: string): string {
  return name.replace(/\brob[oô]s?\b/gi, (term) => {
    const isCapitalized = term[0] === term[0].toUpperCase();
    const isPlural = /s$/i.test(term);
    return `${isCapitalized ? "B" : "b"}ot${isPlural ? "s" : ""}`;
  });
}

function getBotFatherCommandMessage(input: string): string {
  const command = input.trim().toLowerCase().replace(/^\//, '');
  const messages: Record<string, string> = {
    senha: 'Por favor, quero alterar a minha senha.',
    bots: 'Por favor, quero consultar os bots disponíveis.',
    catalogo: 'Por favor, quero consultar os bots disponíveis.',
    catálogo: 'Por favor, quero consultar os bots disponíveis.',
    comprar: 'Por favor, quero consultar os bots disponíveis.',
    loja: 'Por favor, quero consultar os bots disponíveis.',
    produtos: 'Por favor, quero consultar os bots disponíveis.',
    meusbots: 'Por favor, quero consultar os meus bots ativos.',
    mybots: 'Por favor, quero consultar os meus bots ativos.',
    ativos: 'Por favor, quero consultar os meus bots ativos.',
    compras: 'Por favor, quero consultar os meus bots ativos.',
    minhascompras: 'Por favor, quero consultar os meus bots ativos.',
    saldo: 'Por favor, quero consultar o saldo da minha carteira.',
    carteira: 'Por favor, quero consultar o saldo da minha carteira.',
    rendas: 'Por favor, quero consultar os rendimentos dos meus bots.',
    historico: 'Por favor, quero consultar os rendimentos dos meus bots.',
    histórico: 'Por favor, quero consultar os rendimentos dos meus bots.',
    limites: 'Por favor, quero consultar os limites de compra dos bots.',
    limite: 'Por favor, quero consultar os limites de compra dos bots.',
    cupons: 'Por favor, quero consultar os meus cupons.',
    cupon: 'Por favor, quero consultar os meus cupons.',
    coupon: 'Por favor, quero consultar os meus cupons.',
    codigo: 'Por favor, quero consultar os meus cupons.',
    código: 'Por favor, quero consultar os meus cupons.',
    ajuda: 'Por favor, quero ver as opções de ajuda disponíveis.',
    help: 'Por favor, quero ver as opções de ajuda disponíveis.',
    menu: 'Por favor, quero ver as opções de ajuda disponíveis.',
    start: 'Olá, quero ver as opções disponíveis.',
    inicio: 'Olá, quero ver as opções disponíveis.',
    'início': 'Olá, quero ver as opções disponíveis.',
    limpar: 'Quero limpar a conversa.',
    reset: 'Quero limpar a conversa.',
    clear: 'Quero limpar a conversa.',
  };

  return messages[command] || input;
}

function PurchasedBotCountdown({ dataInicio }: { dataInicio: string }) {
  const [sec, setSec] = useState(() => getSecondsUntilNextCredit(dataInicio));

  useEffect(() => {
    const timer = setInterval(() => {
      setSec((prev) => (prev <= 1 ? getSecondsUntilNextCredit(dataInicio) : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [dataInicio]);

  return (
    <span className="font-mono text-[12px] font-bold text-[#2481cc] tabular-nums bg-[#e8f4fd] px-1.5 py-0.5 rounded">
      {formatCountdown(sec)}
    </span>
  );
}

/* ─── Bot Bubble with tail ────────────────────────────────────────── */
function BotBubble({ children, time }: { children: React.ReactNode; time: string }) {
  return (
    <div className="flex flex-col items-start mb-2 max-w-[88%] sm:max-w-[80%] pl-2">
      <div className="relative w-full">
        <svg
          width="9"
          height="20"
          viewBox="0 0 9 20"
          className="absolute"
          style={{ top: 0, left: -8, fill: "#f5f5f5" }}
        >
          <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
        </svg>
        <div
          className="bg-[#f5f5f5] dark:bg-[#182533] rounded-[16px] rounded-tl-none px-3.5 py-2.5 select-text w-full"
          style={{ boxShadow: "0 1px 2px rgba(16,35,47,0.15)" }}
        >
          {children}
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-[#8a8a8a] select-none">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── User Bubble with tail ───────────────────────────────────────── */
function UserBubble({ text, time }: { text: string; time: string }) {
  const isCmd = text?.trim().startsWith("/");
  return (
    <div className="flex justify-end mb-1.5 pr-2">
      <div className="relative max-w-[80%]">
        <div
          className="bg-[#1877f2] text-white dark:bg-[#2b5278] rounded-[16px] rounded-br-none px-3.5 py-2 select-text"
          style={{ boxShadow: "0 1px 2px rgba(16,35,47,0.15)" }}
        >
          <p className={`text-[15px] leading-snug ${isCmd ? "text-white font-medium" : "text-white font-normal"}`}>
            {text}
          </p>
          <div className="flex justify-end items-center gap-1 mt-0.5 select-none">
            <span className="text-[11px] text-white/80">{time}</span>
            <span className="text-[11px] text-white font-bold leading-none">✓✓</span>
          </div>
        </div>
        <svg
          width="9"
          height="20"
          viewBox="0 0 9 20"
          className="absolute"
          style={{ bottom: 0, right: -8, fill: "#1877f2" }}
        >
          <path d="M0 20H9C4.5 20 1 16 0 8V20Z" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Inline Buttons for actions ────────────────────────────────── */
function GrayButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors disabled:opacity-50 w-full flex items-center justify-center gap-1.5"
    >
      {children}
    </button>
  );
}

/* ─── Componente Principal: BotFather Oficial Telegram ───── */
export default function BusinessMessengerBotsChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { t, language, translateFullChats } = useLanguage();
  const { session } = useAuth();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [purchasedBots, setPurchasedBots] = useState<PurchasedBotItem[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const consumedPasswordCommand = useRef(false);
  const pendingReplyTimeouts = useRef<Set<number>>(new Set());

  const quickReplies = [
    { shortcut: "/senha", text: t('bots.cmd_password'), shortLabel: t('suggestion.password') },
    { shortcut: "/bots", text: t('bots.cmd_catalog'), shortLabel: t('suggestion.bots') },
    { shortcut: "/meusbots", text: t('bots.cmd_my_bots'), shortLabel: t('suggestion.active_bots') },
    { shortcut: "/saldo", text: t('bots.cmd_balance'), shortLabel: t('suggestion.balance') },
    { shortcut: "/rendas", text: t('bots.cmd_income'), shortLabel: t('suggestion.income') },
    { shortcut: "/limites", text: t('bots.cmd_limits'), shortLabel: t('suggestion.limits') },
    { shortcut: "/cupons", text: t('bots.cmd_coupons'), shortLabel: t('suggestion.coupon') },
    { shortcut: "/ajuda", text: t('bots.cmd_help'), shortLabel: t('suggestion.help') },
    { shortcut: "/limpar", text: t('bots.cmd_clear'), shortLabel: t('suggestion.clear') },
  ];
  const suggestedReplies = quickReplies.map(({ shortcut, shortLabel }) => ({
    shortcut,
    label: shortLabel,
  }));
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  /* ── Buscar Dados Iniciais do Supabase ── */
  const loadData = useCallback(async () => {
    try {
      const { data: prodsData } = await supabase.rpc("get_available_products_mcpn");
      const cleanProducts: ProductItem[] = Array.isArray(prodsData)
        ? prodsData.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            descricao: p.descricao || "",
            preco: Number(p.preco) || 0,
            renda_diaria: Number(p.renda_diaria) || 0,
            duracao_dias: Number(p.duracao_dias) || 90,
            limite_compra: p.limite_compra || 99,
            imagem_url: p.imagem_url || "",
            size: p.size || "Cloud"
          }))
        : [];
      setProducts(cleanProducts);

      let cleanPurchased: PurchasedBotItem[] = [];
      try {
        const { data: myData, error: rpcErr } = await supabase.rpc("get_my_purchased_products_mcpn");
        if (!rpcErr && Array.isArray(myData) && myData.length > 0) {
          cleanPurchased = myData.map((b: any) => ({
            id: b.id,
            preco_pago: Number(b.preco_pago) || 0,
            renda_diaria: Number(b.renda_diaria) || 0,
            data_inicio: b.data_inicio,
            data_fim: b.data_fim,
            dias_restantes: b.dias_restantes !== undefined ? Number(b.dias_restantes) : 0,
            ativo: Boolean(b.ativo),
            produto_nome: b.produto_nome || "Bot de Renda",
            produto_imagem: b.produto_imagem || "",
            storage_size: b.storage_size || "Cloud"
          }));
        }
      } catch (e) {
        logger.warn('Bots', 'RPC get_my_purchased_products_mcpn falhou', e);
      }

      if (cleanPurchased.length === 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (uid) {
          const { data: sysData, error: sysError } = await (supabase as any)
            .from("sys_600")
            .select("*, produtos(nome, preco, renda_diaria, duracao_dias)")
            .eq("user_id", uid)
            .order("data_inicio", { ascending: false });

          if (!sysError && sysData && Array.isArray(sysData) && sysData.length > 0) {
            cleanPurchased = sysData.map((b: any) => {
              const diffDays = b.data_fim
                ? Math.max(0, Math.ceil((new Date(b.data_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 90;
              const isStillActive = Boolean(b.ativo) && (!b.data_fim || new Date(b.data_fim) > new Date());
              return {
                id: b.id,
                preco_pago: Number(b.preco_pago) || Number(b.produtos?.preco) || 0,
                renda_diaria: Number(b.renda_diaria) || Number(b.produtos?.renda_diaria) || 0,
                data_inicio: b.data_inicio || b.created_at || new Date().toISOString(),
                data_fim: b.data_fim,
                dias_restantes: b.dias_restantes !== undefined ? Number(b.dias_restantes) : diffDays,
                ativo: isStillActive,
                produto_nome: b.produtos?.nome || b.produto_nome || "Bot de Renda",
                produto_imagem: "",
                storage_size: "Cloud"
              };
            });
          }
        }
      }
      setPurchasedBots(cleanPurchased);

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: userData } = await supabase
          .from("sys_t500")
          .select("saldo_disponivel")
          .eq("id", sessionData.session.user.id)
          .single();
        if (userData) {
          setUserBalance(Number(userData.saldo_disponivel) || 0);
        }
      }

      return { cleanProducts, cleanPurchased };
    } catch (err) {
      logger.error('Bots', 'Erro ao carregar dados do gestor de bots:', err);
      return { cleanProducts: [], cleanPurchased: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    clearLegacyAssistantChatHistory();
    if (messages.length > 0) return;

    setIsTyping(true);
    const timeout = window.setTimeout(() => {
      setIsTyping(false);
      setMessages([{
        id: "welcome-botfather-" + Date.now(),
        sender: "bot",
        time: getCurrentTime(),
        type: "welcome",
      }]);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [messages.length]);

  const simulateBotReply = useCallback((builder: () => ChatMessage, delay = 650, onComplete?: () => void) => {
    setIsTyping(true);
    const timeoutId = window.setTimeout(() => {
      pendingReplyTimeouts.current.delete(timeoutId);
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
      onComplete?.();
    }, delay);
    pendingReplyTimeouts.current.add(timeoutId);
  }, []);

  const restartConversation = useCallback(() => {
    pendingReplyTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pendingReplyTimeouts.current.clear();
    setIsTyping(false);
    setInputText("");
    setShowCommandsModal(false);
    setShowCouponModal(false);
    setShowScrollDown(false);
    setMessages([{ id: "welcome-botfather-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "welcome" }]);
    showToast("Conversa reiniciada.", "success");
  }, [showToast]);

  const handlePasswordChanged = useCallback(() => {
    setShowChangePasswordModal(false);
    setMessages((prev) => [
      ...prev,
      {
        id: "bot-password-changed-" + Date.now(),
        sender: "bot",
        time: getCurrentTime(),
        type: "text",
        text: t('password.success'),
      },
    ]);
  }, [t]);

  const handleCouponRedeemed = useCallback(async (message: string) => {
    setShowCouponModal(false);
    await loadData();
    setMessages((prev) => [...prev, {
      id: "bot-coupon-" + Date.now(),
      sender: "bot",
      time: getCurrentTime(),
      type: "text",
      text: `✅ ${message}\n\n${t('bots.coupon_redeemed')}`,
    }]);
  }, [loadData, t]);

  useEffect(() => () => {
    pendingReplyTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pendingReplyTimeouts.current.clear();
  }, []);

  /* ── Tratar Comandos e Mensagens do Usuário ── */
  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const content = (textToSend || inputText).trim();
      if (!content) return;

      const userMsg: ChatMessage = {
        id: "usr-" + Date.now(),
        sender: "user",
        time: getCurrentTime(),
        text: getBotFatherCommandMessage(content),
        type: "text"
      };

      recordChatActivity(session?.user.id, 'business-bot-manager');
      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText("");

      const normalized = content.toLowerCase().replace(/^\//, "").trim();

      const getPurchasedCountForProduct = (prod: ProductItem) => {
        return purchasedBots.filter(
          (b) =>
            b.produto_nome?.trim().toLowerCase() === prod.nome?.trim().toLowerCase() ||
            b.produto_nome?.toLowerCase().includes(prod.nome.toLowerCase().replace(/\s+bot/i, ""))
        ).length;
      };

      if (
        normalized === "start" || normalized === "inicio" || normalized === "início" ||
        normalized === "help" || normalized === "ajuda" || normalized === "menu" || normalized === "comandos"
      ) {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "welcome"
        }));
        return;
      }

      if (normalized === "senha") {
        simulateBotReply(() => ({
          id: "bot-password-form-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "text",
          text: t('bots.password_form_opened'),
        }), 650, () => setShowChangePasswordModal(true));
        return;
      }

      if (
        normalized === "bots" || normalized === "catalogo" || normalized === "catálogo" ||
        normalized === "comprar" || normalized === "newbot" || normalized === "produtos" ||
        normalized === "loja"
      ) {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "catalog", payload: { products }
        }));
        return;
      }

      if (
        normalized === "meusbots" || normalized === "mybots" || normalized === "ativos" ||
        normalized === "compras" || normalized === "minhascompras"
      ) {
        let currentBots = purchasedBots;
        if (!currentBots || currentBots.length === 0) {
          const res = await loadData();
          currentBots = res.cleanPurchased;
        }

        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "my_bots", payload: { bots: currentBots }
        }));
        return;
      }

      if (normalized === "saldo" || normalized === "carteira") {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: `Saldo disponível na carteira: ${formatCurrency(userBalance, "KZ")}. Envie /bots para ver o catálogo.`
        }));
        return;
      }

      if (normalized === "limites" || normalized === "limite") {
        const limitsText = products
          .map((prod) => {
            const bought = getPurchasedCountForProduct(prod);
            const maxLimit = prod.limite_compra || 1;
            const status = bought >= maxLimit ? "Esgotado" : `${maxLimit - bought} disponível(is)`;
            return `• ${displayBotName(prod.nome)}: ${bought}/${maxLimit} comprados (${status})`;
          })
          .join("\n");

        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: `Limites de compra por Bot:\n\n${limitsText}\n\nEnvie /bots para ver o catálogo.`
        }));
        return;
      }

      if (normalized === "rendas" || normalized === "historico" || normalized === "histórico") {
        let currentBots = purchasedBots;
        if (!currentBots || currentBots.length === 0) {
          const res = await loadData();
          currentBots = res.cleanPurchased;
        }

        const activeBots = currentBots.filter((b) => b.ativo);
        const totalDaily = activeBots.reduce((acc, b) => acc + b.renda_diaria, 0);
        const totalInvested = activeBots.reduce((acc, b) => acc + b.preco_pago, 0);

        if (activeBots.length === 0) {
          simulateBotReply(() => ({
            id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
            text: `${t('bots.no_active_bots')} /bots ${t('bots.view_options')}`
          }));
          return;
        }

        const botsSummary = activeBots
          .map((b) => `• ${displayBotName(b.produto_nome)}: +${formatCurrency(b.renda_diaria, "KZ")}/dia (${b.dias_restantes} dias restantes)`)
          .join("\n");

        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: `Rendimentos ativos:\n• Bots ativos: ${activeBots.length}\n• Renda diária total: +${formatCurrency(totalDaily, "KZ")}/dia\n• Total investido: ${formatCurrency(totalInvested, "KZ")}\n\nDetalhamento:\n${botsSummary}`
        }));
        return;
      }

      if (normalized === "limpar" || normalized === "reset" || normalized === "clear") {
        restartConversation();
        return;
      }

      // ── CUPONS ──
      if (normalized === "cupons" || normalized === "cupon" || normalized === "coupon" || normalized === "codigo" || normalized === "código") {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: t('bots.coupon_form_opened'),
        }), 650, () => setShowCouponModal(true));
        return;
      }

      let cleanQuery = normalized.replace(/^info\s+/i, "").replace(/^bot\s+/i, "").replace(/\s+bot$/i, "").trim();
      if (cleanQuery === "ia" || cleanQuery === "botsdeia" || cleanQuery === "botia") cleanQuery = "ia";
      if (cleanQuery === "father" || cleanQuery === "botfather") cleanQuery = "botfother";

      const matchedProd = products.find((p) => {
        const pNome = p.nome.toLowerCase();
        const pClean = pNome.replace(/\s+bot/i, "").trim();
        const pNoSpace = pNome.replace(/\s+/g, "");
        return (cleanQuery === pNome || cleanQuery === pClean || cleanQuery === pNoSpace || (cleanQuery.length >= 3 && (pNome.includes(cleanQuery) || pClean.includes(cleanQuery))));
      });

      if (matchedProd) {
        const boughtCount = getPurchasedCountForProduct(matchedProd);
        const maxLimit = matchedProd.limite_compra || 1;
        const remaining = Math.max(0, maxLimit - boughtCount);

        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "single_bot",
          payload: { product: matchedProd, boughtCount, maxLimit, remaining }
        }));
        return;
      }

      simulateBotReply(() => ({
        id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
        text: `Unrecognized command. Say what?`
      }));
    },
    [inputText, products, purchasedBots, userBalance, simulateBotReply, loadData, restartConversation, session?.user.id, t]
  );

  useEffect(() => {
    const command = searchParams.get("command");
    if (!command) {
      consumedPasswordCommand.current = false;
      return;
    }
    if (command !== "/senha" || consumedPasswordCommand.current) return;

    consumedPasswordCommand.current = true;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("command");
      return next;
    }, { replace: true });
    void handleSendMessage(command);
  }, [handleSendMessage, searchParams, setSearchParams]);

  /* ── Ação de Compra de Bot Direto no Chat ── */
  const handleBuyProduct = useCallback(
    async (product: ProductItem) => {
      setBuyingId(product.id);
      const userMsg: ChatMessage = {
        id: "buy-usr-" + Date.now(),
        sender: "user",
        time: getCurrentTime(),
        text: `/comprar_${product.nome.toLowerCase().replace(/\s+/g, "_")}`,
        type: "text"
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const { data, error } = await supabase.rpc("buy_product_mcpn", { p_product_id: product.id });
        if (error) throw error;
        const result = data as { success: boolean; message: string };

        if (result?.success) {
          showToast(result.message, "success");
          await loadData();
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: "success-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "purchase_success", payload: { product } }
          ]);
        } else {
          setIsTyping(false);
          const raw = (result?.message || "Falha ao processar compra.").replace(/[*#]/g, "");
          const isNoBalance = /saldo\s+insuficiente/i.test(raw);
          setMessages((prev) => [
            ...prev,
            { id: "err-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
              text: isNoBalance ? `Saldo insuficiente. O Bot custa ${formatCurrency(product.preco, "KZ")} e seu saldo atual é de ${formatCurrency(userBalance, "KZ")}. Recarregue sua carteira para continuar.` : `Erro: ${raw}` }
          ]);
          showToast(isNoBalance ? "Saldo insuficiente, recarregue primeiro." : raw, "error");
        }
      } catch (err: any) {
        setIsTyping(false);
        const raw = (err.message || "Erro de conexão ao comprar bot.").replace(/[*#]/g, "");
        setMessages((prev) => [
          ...prev,
          { id: "err-catch-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text", text: `Erro ao ativar Bot: ${raw}` }
        ]);
        showToast(raw, "error");
      } finally {
        setBuyingId(null);
      }
    },
    [loadData, showToast, userBalance]
  );

  function renderTextWithLinks(text: string) {
    return displayBotName(text.replace(/[*#]/g, "")).split("\n").map((line, lIdx, arr) => {
      const parts = line.split(/(\/[-_a-zA-Z0-9]+)/g);
      return (
        <span key={lIdx}>
          {parts.map((part, pIdx) =>
            part.startsWith("/") ? (
              <span key={pIdx} onClick={() => handleSendMessage(part)} className="text-[#1a7ac7] underline cursor-pointer">{part}</span>
            ) : part
          )}
          {lIdx < arr.length - 1 && <br />}
        </span>
      );
    });
  }

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white font-sans select-none transition-colors dark:bg-[#0e1621]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif" }}
    >
      {showChangePasswordModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3"
          onClick={() => setShowChangePasswordModal(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="botfather-change-password-title"
            className="flex max-h-[90dvh] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-[#f1f1f2] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 px-4">
              <h2 id="botfather-change-password-title" className="text-[16px] font-semibold text-[#111827]">
                {t('password.title')}
              </h2>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#667085] hover:bg-black/5"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="overflow-y-auto">
              <ChangePasswordForm onSuccess={handlePasswordChanged} />
            </div>
          </section>
        </div>
      )}

      {showCouponModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3"
          onClick={() => setShowCouponModal(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="botfather-redeem-coupon-title"
            className="w-[92vw] max-w-[400px] overflow-hidden rounded-xl border border-gray-200 bg-[#f1f1f2] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-14 items-center justify-between border-b border-black/5 px-4">
              <h2 id="botfather-redeem-coupon-title" className="text-[16px] font-semibold text-[#111827]">
                {t('coupons.title')}
              </h2>
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#667085] hover:bg-black/5"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <RedeemCouponForm onRedeemed={handleCouponRedeemed} />
          </section>
        </div>
      )}

      {/* ── MODAL DE COMANDOS ── */}
      {showCommandsModal && (
        <div
          className="botfather-commands-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
          onClick={() => setShowCommandsModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="botfather-commands-title"
            className="botfather-commands-dialog w-full max-w-sm max-h-[min(70dvh,32rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-[#182533]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 px-1 pb-2.5 dark:border-gray-700">
              <span id="botfather-commands-title" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Zap className="h-4 w-4 text-[#2481cc]" /> {t('chat.quick_commands')}
              </span>
              <button
                type="button"
                onClick={() => setShowCommandsModal(false)}
                aria-label={t("common.close")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-[#242f3d] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {quickReplies.map(({ shortcut, shortLabel }) => (
                <button
                  key={shortcut}
                  type="button"
                  onClick={() => {
                    setShowCommandsModal(false);
                    handleSendMessage(shortcut);
                  }}
                  className="flex min-h-10 w-full items-center justify-between gap-3 px-2 py-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-[#202d3b] dark:active:bg-[#2a3949]"
                >
                  <span className="shrink-0 font-mono text-xs font-semibold text-[#2481cc]">{shortcut}</span>
                  <span className="min-w-0 truncate text-right text-[11px] text-gray-600 dark:text-gray-300">{shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CABEÇALHO FLUTUANTE ── */}
      <header className="sticky top-0 z-40 flex h-[68px] w-full shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-3 select-none pointer-events-none dark:border-[#27313d] dark:bg-[#17212b]">

        {/* Botão Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-8 shrink-0 items-center justify-center text-black dark:text-white pointer-events-auto cursor-pointer"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
        </button>

        {/* Cápsula central — BotFather */}
        <div
          className="mx-2 flex min-w-0 flex-1 items-center gap-3 pointer-events-auto"
          onClick={() => handleSendMessage("/saldo")}
        >
          <div className="relative h-11 w-11 shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full">
              <img src="/logo_bussiness_messeger.jpg" alt="Teggram X" className="w-full h-full object-cover" />
            </div>
            <span
              className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#10b981] dark:border-[#17212b]"
              title={t('chat.online_now')}
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="flex items-center gap-1 truncate text-[16px] font-semibold leading-[1.15] tracking-tight text-black dark:text-white">
              BotFather
              <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[#2481cc] text-white" aria-hidden="true">
                <Check className="h-[10px] w-[10px]" strokeWidth={3} />
              </span>
            </h1>
            <span
              className={`mt-0.5 flex items-center gap-1 truncate text-[12.5px] font-normal leading-[1.15] ${isTyping ? 'text-[#707579]' : 'text-[#25ae60]'}`}
              aria-live="polite"
            >
              {isTyping ? t('chat.typing') : t('chat.online_now')}
              {isTyping && (
                <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden="true">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Botão Menu */}
        <button
          onClick={() => setShowCommandsModal(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-black dark:text-white pointer-events-auto cursor-pointer"
          aria-label="Mais opções"
        >
          <MoreVertical className="w-[22px] h-[22px]" />
        </button>
      </header>

      {/* ── CHAT ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-white px-2.5 py-3 pb-40 space-y-3 relative select-text dark:bg-[#0e1621]"
      >
        <div className="flex justify-center my-2 select-none">
          <span className="text-white text-[12px] font-medium px-3.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(74, 100, 74, 0.72)", backdropFilter: "blur(4px)" }}>
            Wednesday
          </span>
        </div>

        {messages.map((msg) => {
          if (msg.sender === "user") return <UserBubble key={msg.id} text={msg.text || ""} time={msg.time} />;

          return (
            <React.Fragment key={msg.id}>
              <BotBubble time={msg.time}>
                {msg.type === "welcome" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="text-[14px] text-[#1c1c1e]">
                      Olá! Sou o assistente de bots do Teggram X. Posso ajudar-te com os teus bots, o saldo e os rendimentos. Como posso ajudar?
                    </p>
                  </div>
                )}

                {msg.type === "my_bots" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="font-bold text-[14.5px] mb-1.5">Bots em Execução ({msg.payload?.bots?.length || 0}):</p>
                    {!msg.payload?.bots || msg.payload.bots.length === 0 ? (
                      <p className="text-[#3a3a3c]">{t('bots.no_active_bots')} /bots {t('bots.open_catalog')}</p>
                    ) : (
                      <div className="space-y-3">
                        {msg.payload.bots.map((bot: PurchasedBotItem, idx: number) => (
                          <div key={bot.id || idx} className="text-[13.5px] border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                            <p className="font-bold text-[#1c1c1e] mb-0.5">{idx + 1}. {displayBotName(bot.produto_nome)} <span className="text-[#25ae60] text-[12px] font-semibold">● Ativo</span></p>
                            <p className="text-[#3a3a3c] text-[13px] space-y-0.5">
                              ID: <span className="font-mono text-[12px]">{bot.id?.slice(0, 8).toUpperCase()}</span><br />
                              Renda Diária: <span className="text-[#25ae60] font-semibold">+{formatCurrency(bot.renda_diaria, "KZ")}/dia</span><br />
                              Valor Pago: {formatCurrency(bot.preco_pago, "KZ")}<br />
                              Dias Restantes: {bot.dias_restantes} dias
                            </p>
                            {bot.ativo && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#2481cc]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{t('bots.next_credit_in')}</span>
                                <PurchasedBotCountdown dataInicio={bot.data_inicio} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.type === "catalog" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="font-bold text-[14.5px] mb-2">{t('bots.available')}</p>
                    <div className="space-y-2">
                      {msg.payload?.products?.map((prod: ProductItem, idx: number) => (
                        <div key={prod.id || idx} className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-0 dark:border-gray-700">
                          <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#3a3a3c]">
                            <p className="break-words font-semibold text-[#1c1c1e]">{displayBotName(prod.nome)}</p>
                            <p className="mt-0.5 text-[11.5px] text-[#707579]">
                              {t('bots.price')}: <span className="font-semibold text-[#1c1c1e]">{formatCurrency(prod.preco, "KZ")}</span> · {t('bots.income')}: <span className="font-medium text-[#25ae60]">{formatCurrency(prod.renda_diaria, "KZ")}</span>
                            </p>
                            <p className="text-[11.5px] text-[#707579]">
                              {t('bots.cycle')}: <span className="font-semibold text-[#1c1c1e]">{prod.duracao_dias} {t('common.days')}</span> · {t('bots.total_revenue')}: <span className="font-medium text-[#1a7ac7]">{formatCurrency(prod.renda_diaria * prod.duracao_dias, "KZ")}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBuyProduct(prod)}
                            disabled={buyingId === prod.id}
                            className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-[#2481cc] transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-[#202d3b]"
                          >
                            {buyingId === prod.id ? <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />{t('bots.activating')}</> : t('bots.activate')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.type === "single_bot" && msg.payload?.product && (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#3a3a3c]">
                      <p className="break-words font-semibold text-[#1c1c1e]">{displayBotName(msg.payload.product.nome)}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#707579]">
                        {t('bots.price')}: <span className="font-semibold text-[#1c1c1e]">{formatCurrency(msg.payload.product.preco, "KZ")}</span> · {t('bots.income')}: <span className="font-medium text-[#25ae60]">{formatCurrency(msg.payload.product.renda_diaria, "KZ")}</span>
                      </p>
                      <p className="text-[11.5px] text-[#707579]">
                        {t('bots.cycle')}: <span className="font-semibold text-[#1c1c1e]">{msg.payload.product.duracao_dias} {t('common.days')}</span> · {t('bots.total_revenue')}: <span className="font-medium text-[#1a7ac7]">{formatCurrency(msg.payload.product.renda_diaria * msg.payload.product.duracao_dias, "KZ")}</span>
                      </p>
                      <p className="text-[11.5px] text-[#707579]">{t('bots.limit')}: {msg.payload.boughtCount}/{msg.payload.maxLimit}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuyProduct(msg.payload.product)}
                      disabled={buyingId === msg.payload.product.id || msg.payload.remaining <= 0}
                      className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-[#2481cc] transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-[#202d3b]"
                    >
                      {buyingId === msg.payload.product.id ? <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />{t('bots.activating')}</> : msg.payload.remaining <= 0 ? t('bots.limit') : t('bots.activate')}
                    </button>
                  </div>
                )}

                {msg.type === "purchase_success" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="font-bold text-[#25ae60] text-[14.5px] mb-1">{t('bots.activated_successfully')}</p>
                    <p className="mb-1 text-[#3a3a3c]">{t('bots.activation_key')} (HTTP API):</p>
                    <div className="bg-[#e8f4fd] rounded-[8px] px-2.5 py-1 font-mono text-[12.5px] text-[#1a7ac7] select-all my-1.5">
                      {t('bots.activation_key_unavailable')}
                    </div>
                    <p className="text-[13px] text-[#8a8a8e]">
                      {t('bots.bot_prefix')} <span className="font-semibold text-[#1c1c1e]">{displayBotName(msg.payload?.product?.nome || "Bot")}</span> {t('bots.active_income_prefix')} <span className="font-semibold text-[#25ae60]">+{formatCurrency(msg.payload?.product?.renda_diaria, "KZ")}</span> {t('bots.daily_credit_suffix')}
                    </p>
                  </div>
                )}

                {msg.type === "text" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed whitespace-pre-line font-normal">
                    <AutoTranslatedText
                      text={msg.text || ""}
                      language={language}
                      enabled={translateFullChats}
                      renderFormatted={(translated) => renderTextWithLinks(translated)}
                    />
                  </div>
                )}
              </BotBubble>

            </React.Fragment>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 mb-2 pl-2">
            <div className="bg-white rounded-[18px] rounded-tl-[3px] px-3.5 py-2 flex items-center gap-1.5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8a8e] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8a8e] animate-bounce" style={{ animationDelay: "160ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8a8e] animate-bounce" style={{ animationDelay: "320ms" }} />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {showScrollDown && (
        <button onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })} className="absolute right-3.5 bottom-20 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-[#8a8a8e] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer">
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── FOOTER FLUTUANTE — Input + Botão Enviar ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 flex justify-center border-t border-[#e5e5e5] bg-white px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom,10px))] pointer-events-none dark:border-[#27313d] dark:bg-[#17212b]">
        <div className="flex w-full max-w-[650px] flex-col gap-2 pointer-events-auto">
          <div className="w-full border-b border-[#e5e5e5] pb-4 dark:border-[#27313d]">
              {!messages.some((message) => message.sender === "user") && (
                <p className="mb-3 text-center text-[14px] font-normal leading-5 text-[#707579] dark:text-[#a3adb8]">
                  {t('chat.suggestion_prompt')}
                </p>
              )}
              <div className="flex w-full gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestedReplies.map((reply) => (
                  <button
                    key={reply.shortcut}
                    type="button"
                    onClick={() => handleSendMessage(reply.shortcut)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-[#eeeeee] bg-white px-3 py-1.5 text-[13px] font-normal leading-5 text-[#171717] shadow-[0_3px_6px_rgba(0,0,0,0.16)] transition-transform active:scale-95 dark:border-[#33465a] dark:bg-[#242f3d] dark:text-white"
                  >
                    {reply.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCommandsModal(true)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-[#eeeeee] bg-white px-3 py-1.5 text-[13px] font-normal leading-5 text-[#171717] shadow-[0_3px_6px_rgba(0,0,0,0.16)] transition-transform active:scale-95 dark:border-[#33465a] dark:bg-[#242f3d] dark:text-white"
                >
                  {t('common.help')}
                </button>
              </div>
            </div>
          <div className="flex w-full items-center gap-2 pt-1">
            <div className="flex min-h-[46px] min-w-0 flex-1 items-center rounded-full bg-[#f1f2f4] px-2.5 dark:bg-[#242f3d]">

            <button
              type="button"
              onClick={restartConversation}
              className="mr-1 shrink-0 rounded-full p-1.5 text-[#1877f2] transition-colors hover:bg-gray-100 dark:hover:bg-[#242f3d]"
              title="Reiniciar conversa"
              aria-label="Reiniciar conversa"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t("chat.message_placeholder")}
              className="flex-1 min-w-0 w-0 px-1 py-1 text-[16px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#7b7b7b] font-normal leading-snug"
            />
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[#1877f2] transition-transform active:scale-90 cursor-pointer"
            aria-label={t("common.send")}
          >
            <Send className="h-[25px] w-[25px] fill-current stroke-[1.8]" />
          </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
