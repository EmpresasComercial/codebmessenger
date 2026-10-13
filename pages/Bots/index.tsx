import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical,
  Send,
  Loader2,
  Clock,
  ChevronDown,
  X,
  Zap
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { formatCurrency } from "../../lib/currency";

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
  "/bots", "/catalogo", "/catálogo", "/comprar", "/loja", "/produtos", "/robos", "/robôs",
  "/meusbots", "/mybots", "/ativos", "/compras", "/minhascompras",
  "/saldo", "/carteira", "/rendas", "/historico", "/histórico",
  "/limites", "/limite", "/limpar", "/reset", "/clear",
  "/cupons", "/cupon", "/coupon", "/codigo", "/código"
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd) || cmd.startsWith("/comprar_");
}

/* ─── Chave de Persistência no Dispositivo ─────────────────── */
const CHAT_STORAGE_KEY = "telegram_botfather_chat_v3";

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
          style={{ top: 0, left: -8, fill: "white" }}
        >
          <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
        </svg>
        <div
          className="bg-white rounded-[16px] rounded-tl-none px-3.5 py-2.5 select-text w-full"
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
          className="bg-[#eeffde] rounded-[16px] rounded-br-none px-3.5 py-2 select-text"
          style={{ boxShadow: "0 1px 2px rgba(16,35,47,0.15)" }}
        >
          <p className={`text-[15px] leading-snug ${isCmd ? "text-[#1a7ac7] font-medium" : "text-black font-normal"}`}>
            {text}
          </p>
          <div className="flex justify-end items-center gap-1 mt-0.5 select-none">
            <span className="text-[11px] text-[#6a9a6a]">{time}</span>
            <span className="text-[11px] text-[#4fae4e] font-bold leading-none">✓✓</span>
          </div>
        </div>
        <svg
          width="9"
          height="20"
          viewBox="0 0 9 20"
          className="absolute"
          style={{ bottom: 0, right: -8, fill: "#eeffde" }}
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
export default function TelegramBotsChat() {
  const navigate = useNavigate();
  const { showToast } = useToast();

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

  const quickReplies = [
    { shortcut: "/bots", text: "Ver catálogo completo de robôs de rendimento" },
    { shortcut: "/meusbots", text: "Consultar robôs ativos e ganhos diários" },
    { shortcut: "/saldo", text: "Ver saldo em conta e lucros acumulados" },
    { shortcut: "/cupons", text: "Resgatar código promocional ou cupom" },
    { shortcut: "/ajuda", text: "Instruções de ativação e suporte do BotFather" },
  ];
  const [awaitingCoupon, setAwaitingCoupon] = useState(false);
  const [isRedeemingCoupon, setIsRedeemingCoupon] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Persistência local no dispositivo do usuário
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error("Erro ao salvar histórico do chat no dispositivo:", e);
      }
    }
  }, [messages]);

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
            produto_nome: b.produto_nome || "Robô de Renda",
            produto_imagem: b.produto_imagem || "",
            storage_size: b.storage_size || "Cloud"
          }));
        }
      } catch (e) {
        console.warn("RPC get_my_purchased_products_mcpn falhou", e);
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
                produto_nome: b.produtos?.nome || b.produto_nome || "Robô de Renda",
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
      console.error("Erro ao carregar dados do BotFather:", err);
      return { cleanProducts: [], cleanPurchased: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Inicialização com Persistência no Dispositivo ── */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    async function initConversation() {
      await loadData();

      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {
        console.error("Erro ao restaurar histórico salvo:", e);
      }

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: "welcome-botfather",
            sender: "bot",
            time: getCurrentTime(),
            type: "welcome"
          }
        ]);
      }, 500);
    }

    initConversation();
  }, [loadData]);

  const simulateBotReply = useCallback((builder: () => ChatMessage, delay = 650) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
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
        text: content,
        type: "text"
      };

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

      if (
        normalized === "bots" || normalized === "catalogo" || normalized === "catálogo" ||
        normalized === "comprar" || normalized === "newbot" || normalized === "produtos" ||
        normalized === "loja" || normalized === "robos" || normalized === "robôs"
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
            return `• ${prod.nome}: ${bought}/${maxLimit} comprados (${status})`;
          })
          .join("\n");

        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: `Limites de compra por robô:\n\n${limitsText}\n\nEnvie /bots para ver o catálogo.`
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
            text: `Você não possui robôs ativos no momento. Envie /bots para ver as opções disponíveis.`
          }));
          return;
        }

        const botsSummary = activeBots
          .map((b) => `• ${b.produto_nome}: +${formatCurrency(b.renda_diaria, "KZ")}/dia (${b.dias_restantes} dias restantes)`)
          .join("\n");

        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: `Rendimentos ativos:\n• Robôs ativos: ${activeBots.length}\n• Renda diária total: +${formatCurrency(totalDaily, "KZ")}/dia\n• Total investido: ${formatCurrency(totalInvested, "KZ")}\n\nDetalhamento:\n${botsSummary}`
        }));
        return;
      }

      if (normalized === "limpar" || normalized === "reset" || normalized === "clear") {
        try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch (e) {}
        setMessages([{ id: "welcome-botfather-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "welcome" }]);
        showToast("Histórico de conversa reiniciado.", "success");
        return;
      }

      // ── CUPONS ──
      if (normalized === "cupons" || normalized === "cupon" || normalized === "coupon" || normalized === "codigo" || normalized === "código") {
        setAwaitingCoupon(true);
        simulateBotReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
          text: "🎟️ *Resgatar Cupom*\n\nPor favor, cole ou digite o código do seu cupom:\n\nO código é composto por letras maiúsculas e números.\nExemplo: TGRAM2024"
        }));
        return;
      }

      // ── AGUARDANDO CÓDIGO DE CUPOM ──
      if (awaitingCoupon) {
        const code = content.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (code.length < 5) {
          simulateBotReply(() => ({
            id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
            text: "❌ Código inválido. O código deve ter pelo menos 5 caracteres com letras maiúsculas e números. Tente novamente ou envie /cupons para cancelar."
          }));
          return;
        }
        setAwaitingCoupon(false);
        setIsRedeemingCoupon(true);
        setIsTyping(true);
        try {
          const { data, error } = await supabase.rpc('redeem_coupon_mcpn', { p_code: code });
          if (error) throw error;
          const result = data as { success: boolean; message: string } | null;
          setIsTyping(false);
          if (result && result.success) {
            showToast(result.message, 'success');
            await loadData();
            setMessages((prev) => [...prev, {
              id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
              text: `✅ ${result.message}\n\nSeu saldo foi atualizado! Envie /saldo para confirmar.`
            }]);
          } else {
            setMessages((prev) => [...prev, {
              id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
              text: `❌ ${result?.message || 'Erro ao resgatar cupom'}\n\nVerifique o código e tente novamente com /cupons.`
            }]);
            showToast(result?.message || 'Erro ao resgatar cupom', 'error');
          }
        } catch (err: any) {
          setIsTyping(false);
          setMessages((prev) => [...prev, {
            id: "bot-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text",
            text: `❌ ${err.message || 'Erro ao resgatar cupom'}\n\nTente novamente com /cupons.`
          }]);
          showToast(err.message || 'Erro ao resgatar cupom', 'error');
        } finally {
          setIsRedeemingCoupon(false);
        }
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
    [inputText, products, purchasedBots, userBalance, simulateBotReply, loadData, awaitingCoupon]
  );

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
              text: isNoBalance ? `Saldo insuficiente. O robô custa ${formatCurrency(product.preco, "KZ")} e seu saldo atual é de ${formatCurrency(userBalance, "KZ")}. Recarregue sua carteira para continuar.` : `Erro: ${raw}` }
          ]);
          showToast(isNoBalance ? "Saldo insuficiente, recarregue primeiro." : raw, "error");
        }
      } catch (err: any) {
        setIsTyping(false);
        const raw = (err.message || "Erro de conexão ao comprar bot.").replace(/[*#]/g, "");
        setMessages((prev) => [
          ...prev,
          { id: "err-catch-" + Date.now(), sender: "bot", time: getCurrentTime(), type: "text", text: `Erro ao ativar robô: ${raw}` }
        ]);
        showToast(raw, "error");
      } finally {
        setBuyingId(null);
      }
    },
    [loadData, showToast, userBalance]
  );

  function renderTextWithLinks(text: string) {
    return text.replace(/[*#]/g, "").split("\n").map((line, lIdx, arr) => {
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
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none relative"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif",
        backgroundColor: '#afc8af',
        backgroundImage: DOODLE_BG
      }}
    >
      {/* ── MODAL DE COMANDOS ── */}
      {showCommandsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowCommandsModal(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative bg-white w-full max-w-md rounded-t-[20px] px-4 pt-4 pb-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] font-bold text-gray-900">Comandos</span>
              <button onClick={() => setShowCommandsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {[
                { cmd: "/bots", label: "Ver catálogo de robôs" },
                { cmd: "/meusbots", label: "Meus robôs ativos" },
                { cmd: "/saldo", label: "Consultar saldo" },
                { cmd: "/rendas", label: "Rendimentos diários" },
                { cmd: "/limites", label: "Limites de compra" },
                { cmd: "/cupons", label: "Resgatar cupom de saldo" },
                { cmd: "/ajuda", label: "Lista de comandos" },
                { cmd: "/limpar", label: "Limpar conversa" },
              ].map(({ cmd, label }) => (
                <button
                  key={cmd}
                  onClick={() => { setShowCommandsModal(false); handleSendMessage(cmd); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer text-left"
                >
                  <span className="text-[#1a7ac7] font-medium text-[14px] min-w-[100px]">{cmd}</span>
                  <span className="text-gray-500 text-[13.5px]">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CABEÇALHO FLUTUANTE ── */}
      <header className="w-full bg-transparent px-3 py-3 sticky top-0 z-40 flex items-center justify-between select-none pointer-events-none">

        {/* Botão Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto cursor-pointer"
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>

        {/* Cápsula central — BotFather */}
        <div
          className="flex w-0 flex-1 items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 cursor-pointer active:scale-[0.98] transition-transform pointer-events-auto"
          onClick={() => handleSendMessage("/saldo")}
        >
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
            <img src="/BotFather.jpg" alt="BotFather" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/botfather.png"; }} />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-bold text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
              BotFather
            </h1>
            <span className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] font-normal leading-[1.15] mt-0.5 truncate">
              8,885,239 usuários mensais
            </span>
          </div>
        </div>

        {/* Botão Menu */}
        <button
          onClick={() => setShowCommandsModal(true)}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto cursor-pointer"
          aria-label="Mais opções"
        >
          <MoreVertical className="w-[22px] h-[22px]" />
        </button>
      </header>

      {/* ── CHAT ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-3 pb-24 space-y-1 relative select-text"
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
                    <p className="mb-2 text-[14px] text-[#1c1c1e]">
                      Olá, eu sou o BOTFATHER! Posso te ajudar a consultar seu saldo, histórico de rendimentos, compras e suporte.
                    </p>
                    <p className="text-[13.5px]">
                      <span onClick={() => handleSendMessage("/bots")} className="text-[#1a7ac7] underline cursor-pointer">Catálogo</span>{" · "}
                      <span onClick={() => handleSendMessage("/saldo")} className="text-[#1a7ac7] underline cursor-pointer">Saldo</span>{" · "}
                      <span onClick={() => handleSendMessage("/meusbots")} className="text-[#1a7ac7] underline cursor-pointer">Meus Bots</span>{" · "}
                      <span onClick={() => handleSendMessage("/rendas")} className="text-[#1a7ac7] underline cursor-pointer">Rendimentos</span>{" · "}
                      <span onClick={() => handleSendMessage("/limites")} className="text-[#1a7ac7] underline cursor-pointer">Limites</span>{" · "}
                      <span onClick={() => handleSendMessage("/ajuda")} className="text-[#1a7ac7] underline cursor-pointer">Ajuda</span>
                    </p>
                  </div>
                )}

                {msg.type === "my_bots" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="font-bold text-[14.5px] mb-1.5">Robôs em Execução ({msg.payload?.bots?.length || 0}):</p>
                    {!msg.payload?.bots || msg.payload.bots.length === 0 ? (
                      <p className="text-[#3a3a3c]">Você não possui robôs comprados. Envie /bots para abrir o catálogo.</p>
                    ) : (
                      <div className="space-y-3">
                        {msg.payload.bots.map((bot: PurchasedBotItem, idx: number) => (
                          <div key={bot.id || idx} className="text-[13.5px] border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                            <p className="font-bold text-[#1c1c1e] mb-0.5">{idx + 1}. {bot.produto_nome} <span className="text-[#25ae60] text-[12px] font-semibold">● Ativo</span></p>
                            <p className="text-[#3a3a3c] text-[13px] space-y-0.5">
                              ID: <span className="font-mono text-[12px]">{bot.id?.slice(0, 8).toUpperCase()}</span><br />
                              Renda Diária: <span className="text-[#25ae60] font-semibold">+{formatCurrency(bot.renda_diaria, "KZ")}/dia</span><br />
                              Valor Pago: {formatCurrency(bot.preco_pago, "KZ")}<br />
                              Dias Restantes: {bot.dias_restantes} dias
                            </p>
                            {bot.ativo && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#2481cc]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Próximo crédito em:</span>
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
                    <p className="font-bold text-[14.5px] mb-1.5">Robôs Disponíveis para Compra:</p>
                    <div className="space-y-3">
                      {msg.payload?.products?.map((prod: ProductItem, idx: number) => (
                        <div key={prod.id || idx} className="text-[13.5px] text-[#3a3a3c]">
                          <span className="font-bold text-[#1c1c1e]">{idx + 1}. {prod.nome}</span> — {formatCurrency(prod.preco, "KZ")}<br />
                          <span className="text-[#8a8a8e] text-[12.5px]">
                            Renda: <span className="text-[#25ae60] font-medium">+{formatCurrency(prod.renda_diaria, "KZ")}/dia</span> • Duração: {prod.duracao_dias} dias • Renda Total: {formatCurrency(prod.renda_diaria * prod.duracao_dias, "KZ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.type === "single_bot" && msg.payload?.product && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="font-bold text-[14.5px] text-[#1a7ac7] mb-1.5">Informações do {msg.payload.product.nome}:</p>
                    <p className="text-[13.5px] text-[#3a3a3c] space-y-1">
                      • Preço: {formatCurrency(msg.payload.product.preco, "KZ")}<br />
                      • Renda Diária: <span className="text-[#25ae60] font-semibold">+{formatCurrency(msg.payload.product.renda_diaria, "KZ")} / dia</span><br />
                      • Duração: {msg.payload.product.duracao_dias} dias<br />
                      • Renda Total: <span className="text-[#1a7ac7] font-semibold">{formatCurrency(msg.payload.product.renda_diaria * msg.payload.product.duracao_dias, "KZ")}</span><br />
                      • Limite: {msg.payload.boughtCount >= msg.payload.maxLimit ? (
                        <span className="text-amber-600 font-semibold">Atingido ({msg.payload.boughtCount}/{msg.payload.maxLimit})</span>
                      ) : (
                        <span>{msg.payload.boughtCount}/{msg.payload.maxLimit} comprados</span>
                      )}
                    </p>
                  </div>
                )}

                {msg.type === "purchase_success" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                    <p className="font-bold text-[#25ae60] text-[14.5px] mb-1">Robô Comprado com Sucesso!</p>
                    <p className="mb-1 text-[#3a3a3c]">Chave de Ativação (HTTP API):</p>
                    <div className="bg-[#e8f4fd] rounded-[8px] px-2.5 py-1 font-mono text-[12.5px] text-[#1a7ac7] select-all my-1.5">
                      8723751541:AAF1i3n8zKtRJd5_mJmVDw0vQvJhMjzUjWU
                    </div>
                    <p className="text-[13px] text-[#8a8a8e]">
                      O robô <span className="font-semibold text-[#1c1c1e]">{msg.payload?.product?.nome}</span> está ativo. Rendimento de <span className="font-semibold text-[#25ae60]">+{formatCurrency(msg.payload?.product?.renda_diaria, "KZ")}</span> creditado diariamente.
                    </p>
                  </div>
                )}

                {msg.type === "text" && (
                  <div className="text-[14px] text-[#1c1c1e] leading-relaxed whitespace-pre-line font-normal">
                    {renderTextWithLinks(msg.text || "")}
                  </div>
                )}
              </BotBubble>

              {/* Botões Inline anexados à mensagem */}
              {msg.type === "welcome" && (
                <div className="w-full max-w-[80%] flex items-center justify-center -mt-1.5 mb-2 pl-2">
                  <GrayButton onClick={() => handleSendMessage("/bots")}>
                    « Back to Bot List
                  </GrayButton>
                </div>
              )}
              {msg.type === "catalog" && msg.payload?.products && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  {msg.payload.products.map((prod: ProductItem) => {
                    const isBuyingThis = buyingId === prod.id;
                    return (
                      <GrayButton key={prod.id} onClick={() => handleBuyProduct(prod)} disabled={isBuyingThis}>
                        {isBuyingThis ? <><Loader2 className="w-4 h-4 animate-spin" /> Comprando...</> : `Comprar ${prod.nome}`}
                      </GrayButton>
                    );
                  })}
                </div>
              )}
              {msg.type === "single_bot" && msg.payload?.product && (
                <div className="w-full max-w-[80%] flex items-center justify-center -mt-1.5 mb-2 pl-2">
                  <GrayButton onClick={() => handleBuyProduct(msg.payload.product)} disabled={buyingId === msg.payload.product.id || msg.payload.remaining <= 0}>
                    {buyingId === msg.payload.product.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Comprando...</> : msg.payload.remaining <= 0 ? "⚠️ Limite atingido" : `Comprar ${msg.payload.product.nome}`}
                  </GrayButton>
                </div>
              )}
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

      {/* ── QUICK HINTS (RESPOSTAS RÁPIDAS / COMANDOS) ── */}
      {showCommandsModal && (
        <div className="fixed bottom-[65px] left-0 right-0 flex justify-center px-2 sm:px-6 z-40 animate-in slide-in-from-bottom-2">
          <div className="w-full max-w-[650px] bg-white dark:bg-[#182533] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-semibold text-[#2481cc] uppercase">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Comandos Rápidos (BotFather)
              </span>
              <button
                type="button"
                onClick={() => setShowCommandsModal(false)}
                className="text-gray-400 hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            {quickReplies.map((qr) => (
              <button
                key={qr.shortcut}
                type="button"
                onClick={() => {
                  setShowCommandsModal(false);
                  handleSendMessage(qr.shortcut);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="font-mono font-bold text-[#2481cc]">{qr.shortcut}</span>
                <span className="text-gray-600 dark:text-gray-300 truncate max-w-[70%]">{qr.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER FLUTUANTE — Input + Botão Enviar ── */}
      <footer className="fixed bottom-0 left-0 right-0 p-2 pb-[max(12px,env(safe-area-inset-bottom,12px))] z-40 flex justify-center bg-transparent pointer-events-none">
        <div className="w-full max-w-[650px] flex items-center gap-1.5 sm:gap-2 pointer-events-auto px-1 sm:px-2">
          <div className="flex-1 min-w-0 bg-white dark:bg-[#182533] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-2.5 sm:px-3 py-1.5 min-h-[48px] border border-black/5 dark:border-white/10 transition-colors">
            {/* ⚡ Comandos Rápidos */}
            <button
              type="button"
              onClick={() => setShowCommandsModal(!showCommandsModal)}
              className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 mr-1 ${
                showCommandsModal ? "text-[#2481cc] bg-[#2481cc]/15" : "text-[#707579] hover:text-[#2481cc]"
              }`}
              title="Comandos Rápidos"
            >
              <Zap className="w-5 h-5" />
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
              placeholder="Mensagem"
              className="flex-1 min-w-0 w-0 px-1 py-1 text-[14.5px] sm:text-[15px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#8e8e93] font-normal leading-snug"
            />
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] rounded-full text-white bg-[#2481cc] hover:bg-[#1f72b5] flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(36,129,204,0.4)] cursor-pointer"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
