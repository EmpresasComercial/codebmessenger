import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  Send,
  ChevronDown,
  Copy,
  Check,
  Paperclip,
  Building2,
  Wallet,
  Clock,
  FileText,
  RotateCcw,
  Camera,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import PdfDownloadCard, { formatFileSize } from '../components/PdfDownloadCard';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { useLanguage } from '../contexts/LanguageContext';

const MIN_RECHARGE = 3000;
const MAX_RECHARGE = 500000;
const CHAT_STORAGE_KEY = 'telegram_deposit_bot_v3';

const rechargeSession = {
  get: () => {
    try {
      const id = localStorage.getItem('deposit_bot_recharge_id');
      const amtStr = localStorage.getItem('deposit_bot_current_amount');
      const bankStr = localStorage.getItem('deposit_bot_current_bank');
      return {
        rechargeId: id || null,
        amount: amtStr ? Number(amtStr) : null,
        bank: bankStr ? JSON.parse(bankStr) : null,
      };
    } catch {
      return { rechargeId: null, amount: null, bank: null };
    }
  },
  set: (id: string | null, amount: number | null, bank: CollectionBank | null) => {
    try {
      if (id) localStorage.setItem('deposit_bot_recharge_id', id);
      else localStorage.removeItem('deposit_bot_recharge_id');

      if (amount !== null) localStorage.setItem('deposit_bot_current_amount', String(amount));
      else localStorage.removeItem('deposit_bot_current_amount');

      if (bank) localStorage.setItem('deposit_bot_current_bank', JSON.stringify(bank));
      else localStorage.removeItem('deposit_bot_current_bank');
    } catch { }
  },
  clear: () => {
    try {
      localStorage.removeItem('deposit_bot_recharge_id');
      localStorage.removeItem('deposit_bot_current_amount');
      localStorage.removeItem('deposit_bot_current_bank');
    } catch { }
  }
};

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/depositar', '/recarregar', '/deposito', '/recarga',
  '/saldo', '/carteira',
  '/bancos', '/banco', '/contas',
  '/horario', '/horarios',
  '/limites', '/regras', '/taxa', '/taxas',
  '/historico', '/registos',
  '/total', '/total_deposito', '/total_depositos', '/meus_depositos', '/extrato', '/relatorio',
  '/limpar', '/reset', '/clear',
  '/cancelar', '/cancelar_deposito', '/cancelar-deposito', '/cancelar_pedido', '/cancelar-pedido'
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd) || /^\/\d+$/.test(cmd);
}

function isCancelRechargeRequest(text: string): boolean {
  const normalized = text
    .trim()
    .toLocaleLowerCase('pt')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
  return [
    'cancelar',
    'cancela',
    'cancelar deposito',
    'cancelar pedido',
    'cancelar recarga',
    'cancelar pedido de deposito',
    '/cancelar',
    '/cancelar_deposito',
    '/cancelar-deposito',
    '/cancelar_pedido',
    '/cancelar-pedido',
  ].includes(normalized);
}

function parseDepositNaturalLanguage(rawInput: string): {
  intent: 'balance' | 'deposit' | 'history' | 'banks' | 'schedule' | 'limits' | 'help' | 'clear' | 'cancel' | 'total' | 'greeting' | 'support' | 'unknown';
  amount?: number;
} {
  const clean = rawInput.trim();
  const lower = clean.toLowerCase();
  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  if (['cancelar', 'cancela', 'cancelado', 'nao', 'abortar', 'deixa', 'deixa pra la', 'desistir', 'esquece', 'voltar', 'sair'].includes(norm))
    return { intent: 'cancel' };

  if (['limpar', 'reset', 'clear', 'limpar chat', 'limpar conversa', 'apagar conversa', 'reiniciar'].includes(norm))
    return { intent: 'clear' };

  const reportsUncreditedRecharge =
    ['nao caiu', 'nao entrou', 'nao apareceu', 'nao recebi', 'nao foi creditado', 'nao refletiu'].some((phrase) => norm.includes(phrase)) &&
    ['deposito', 'recarga', 'carreguei', 'saldo', 'comprovativo', 'comprovante', 'transferencia', 'dinheiro'].some((word) => norm.includes(word));
  const asksRechargeDelay =
    ['quanto tempo', 'demora', 'prazo', 'quando cai', 'quando entra', 'quando reflete', 'refletir'].some((phrase) => norm.includes(phrase)) &&
    ['deposito', 'recarga', 'carreguei', 'saldo', 'comprovativo', 'comprovante', 'transferencia', 'dinheiro'].some((word) => norm.includes(word));
  const asksAfterRecharge =
    ['depois de', 'apos', 'após'].some((phrase) => norm.includes(phrase)) &&
    ['depositar', 'deposito', 'recarregar', 'recarga', 'carregar', 'transferencia'].some((word) => norm.includes(word)) &&
    ['o que', 'fazer', 'agora', 'sucesso', 'concluido'].some((word) => norm.includes(word));
  const expressesSuspicionOrConcern =
    ['burla', 'fraude', 'golpe', 'scam', 'enganado', 'enganada', 'perdi dinheiro', 'preocupado', 'preocupada', 'medo', 'ansioso', 'ansiosa'].some((word) => norm.includes(word));
  if (reportsUncreditedRecharge || asksRechargeDelay || asksAfterRecharge || expressesSuspicionOrConcern) return { intent: 'support' };

  // Saudações conversacionais
  const greetings = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'e ai', 'tudo bem', 'tudo bom', 'como vai', 'fala', 'alo'];
  const includesTaskOrQuestion = /\b(deposit|recarga|recarreg|saldo|banco|histor|taxa|comprov|prazo|quanto|como|quero|preciso|transfer|carregar|levantamento|retirada)\w*/.test(norm);
  if (!includesTaskOrQuestion && (greetings.includes(norm) || greetings.some(g => norm.startsWith(g + ' ') || norm.endsWith(' ' + g)))) {
    return { intent: 'greeting' };
  }

  // Saldo
  if (
    norm === '/saldo' || norm === '/carteira' ||
    norm.includes('saldo') || norm.includes('carteira') ||
    norm.includes('quanto tenho') || norm.includes('quanto eu tenho') ||
    norm.includes('meu dinheiro') || norm.includes('dinheiro na conta') ||
    norm.includes('ver saldo') || norm.includes('consultar saldo') ||
    norm.includes('quanto posso') || norm.includes('quanto sobrou') ||
    norm.includes('meu saldo') || norm.includes('saldo disponivel')
  ) return { intent: 'balance' };

  // Histórico
  if (
    norm === '/historico' || norm === '/registos' ||
    norm.includes('historico') || norm.includes('extrato') ||
    norm.includes('meus depositos') || norm.includes('minhas recargas') ||
    norm.includes('ver historico') || norm.includes('ultimos depositos') ||
    norm.includes('ultimas recargas') || norm.includes('depositos anteriores') ||
    norm.includes('registos') || norm.includes('status do meu deposito')
  ) return { intent: 'history' };

  // Total / Relatório
  if (
    norm === '/total' || norm === '/relatorio' ||
    norm.includes('total deposito') || norm.includes('total de deposito') ||
    norm.includes('relatorio') || norm.includes('resumo') || norm.includes('quanto depositei')
  ) return { intent: 'total' };

  // Bancos
  if (
    norm === '/bancos' || norm === '/banco' || norm === '/contas' ||
    norm.includes('qual banco') || norm.includes('bancos disponiveis') ||
    norm.includes('contas disponiveis') || norm.includes('lista de bancos') ||
    norm.includes('quais bancos') || norm.includes('metodos de pagamento') ||
    norm.includes('para onde transferir') || norm.includes('dados bancarios') ||
    norm.includes('onde depositar') || norm.includes('onde pagar')
  ) return { intent: 'banks' };

  // Horário
  if (
    norm === '/horario' || norm === '/horarios' ||
    norm.includes('horario') || norm.includes('que horas') ||
    norm.includes('ta aberto') || norm.includes('esta aberto') ||
    norm.includes('quando abre') || norm.includes('atendimento') || norm.includes('funciona') ||
    norm.includes('posso depositar agora')
  ) return { intent: 'schedule' };

  // Limites
  if (
    norm === '/limites' || norm === '/regras' || norm === '/taxa' ||
    norm.includes('taxa') || norm.includes('limite') ||
    norm.includes('valor minimo') || norm.includes('valor maximo') ||
    norm.includes('regras') || norm.includes('quanto posso depositar') ||
    norm.includes('qual o minimo') || norm.includes('minimo de deposito')
  ) return { intent: 'limits' };

  // Depósito com valor extraído
  const depositTriggers = ['depositar', 'recarregar', 'deposito', 'recarga', 'quero depositar', 'fazer deposito', 'fazer uma recarga', 'enviar', 'transferir', 'por saldo', 'colocar dinheiro', 'meter saldo', 'meter dinheiro', 'carregar a carteira', 'carregar a conta'];
  const hasDepositWord = depositTriggers.some(w => norm.includes(w)) || norm.startsWith('/depositar') || norm.startsWith('/recarregar');
  const numberMatch = norm.match(/(?:(?:kz|ao|akz)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:kz|kwanza|reais|ao|akz))?/i);
  if (numberMatch && (hasDepositWord || /^\d+$/.test(clean.replace(/[\s.,]/g, '')))) {
    const rawVal = numberMatch[1].replace(/\./g, '').replace(',', '.');
    const parsedAmt = Math.floor(parseFloat(rawVal));
    if (!isNaN(parsedAmt) && parsedAmt > 0) return { intent: 'deposit', amount: parsedAmt };
  }
  if (hasDepositWord) return { intent: 'deposit' };

  // Ajuda
  if (
    norm === '/ajuda' || norm === '/help' || norm === '/menu' || norm === '/start' || norm === '/inicio' ||
    ['ajuda', 'help', 'menu', 'inicio', 'start', 'como funciona', 'comandos', 'o que voce faz'].includes(norm)
  ) return { intent: 'help' };

  return { intent: 'unknown' };
}

const compressImage = async (file: File): Promise<Blob> => {
  // Se não for imagem ou já tiver menos de 1MB, não comprime
  if (!file.type.startsWith('image/') || file.size <= 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX = 1200;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
};

interface CollectionBank {
  id: string;
  nome_banco: string;
  nome_proprietario: string;
  iban: string;
  created_at?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  time: string;
  text?: string;
  imageUrl?: string;
  attachment?: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    storagePath?: string;
  };
  type:
    | 'welcome'
    | 'text'
    | 'amount_selector'
    | 'bank_selector'
    | 'deposit_instructions'
    | 'proof_success'
    | 'history_list'
    | 'banks_list'
    | 'deposit_summary';
  payload?: any;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

function createBotMsg(
  type: ChatMessage['type'],
  text?: string,
  payload?: any,
  idSuffix?: string
): ChatMessage {
  return {
    id: idSuffix ? `bot-${idSuffix}-${Date.now()}` : `bot-${Date.now()}`,
    sender: 'bot',
    time: nowTime(),
    type,
    text,
    payload,
  };
}

function getCurrentDay(): string {
  const daysPt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return daysPt[new Date().getDay()];
}

function formatStatus(statusStr?: string | null): { label: string; badgeClass: string } {
  const st = (statusStr || 'pendente').toLowerCase();
  if (st === 'aprovado' || st === 'concluido' || st === 'approved' || st === 'completed') {
    return { label: 'Aprovado', badgeClass: 'bg-green-100 text-green-700' };
  }
  if (st === 'rejeitado' || st === 'cancelado' || st === 'failed' || st === 'recusado') {
    return { label: 'Recusado', badgeClass: 'bg-red-100 text-red-700' };
  }
  return { label: 'Pendente', badgeClass: 'bg-yellow-100 text-yellow-800' };
}

function validateRechargeAmount(
  amount: number,
  t: (key: 'recharge.min_limit' | 'recharge.max_limit') => string
): { valid: boolean; errorText?: string } {
  if (amount < MIN_RECHARGE) {
    return {
      valid: false,
      errorText: `${t('recharge.min_limit')} ${formatCurrency(MIN_RECHARGE, 'KZ')}.`
    };
  }
  if (amount > MAX_RECHARGE) {
    return {
      valid: false,
      errorText: `${t('recharge.max_limit')} ${formatCurrency(MAX_RECHARGE, 'KZ')}.`
    };
  }
  return { valid: true };
}

const BotFormattedText = React.memo(function BotFormattedText({
  text,
  onCommandClick,
}: {
  text: string;
  onCommandClick: (cmd: string) => void;
}) {
  return (
    <>
      {text.split('\n').map((line, lIdx, arr) => {
        const parts = line.split(/(\*\*.*?\*\*|`[^`]+`|\/[-_a-zA-Z0-9]+)/g);
        return (
          <span key={lIdx}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code
                    key={pIdx}
                    className="font-mono text-[12px] bg-gray-100 px-1 py-0.5 rounded text-[#2481cc]"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              if (part.startsWith('/') && VALID_COMMANDS.has(part.toLowerCase())) {
                return (
                  <span
                    key={pIdx}
                    onClick={() => onCommandClick(part)}
                    className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                  >
                    {part}
                  </span>
                );
              }
              return part;
            })}
            {lIdx < arr.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
});

export default function playmentbot() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalRecharges, setTotalRecharges] = useState<number>(0);
  const [collectionBanks, setCollectionBanks] = useState<CollectionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [showQuickHints, setShowQuickHints] = useState(false);

  const quickReplies = [
    { shortcut: '/depositar', text: 'Iniciar recarga e depósito bancário' },
    { shortcut: '/saldo', text: 'Consultar saldo da conta e carteira' },
    { shortcut: '/bancos', text: 'Ver dados bancários e contas disponíveis' },
    { shortcut: '/historico', text: t('recharge.history_title') },
    { shortcut: '/limites', text: 'Ver valores mínimo e máximo e as taxas' },
    { shortcut: '/horarios', text: 'Consultar horário de funcionamento' },
    { shortcut: '/total_deposito', text: 'Ver relatório e total de depósitos' },
    { shortcut: '/ajuda', text: 'Instruções e ajuda do Payments Bot' },
  ];

  const [depositAmount, setDepositAmount] = useState<number | null>(() => rechargeSession.get().amount);
  const [selectedBank, setSelectedBank] = useState<CollectionBank | null>(() => rechargeSession.get().bank);
  const [activeRechargeId, setActiveRechargeId] = useState<string | null>(() => rechargeSession.get().rechargeId);
  const awaitingProof = Boolean(activeRechargeId && selectedBank && depositAmount !== null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileDocInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  const restartConversation = useCallback(() => {
    if (awaitingProof) {
      showToast('Envia o comprovativo ou cancela o pedido antes de reiniciar a conversa.', 'error');
      return;
    }
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.error('Não foi possível limpar o histórico local do Playment Bot:', error);
    }
    rechargeSession.clear();
    setDepositAmount(null);
    setSelectedBank(null);
    setActiveRechargeId(null);
    setShowQuickHints(false);
    setMessages([createBotMsg('welcome', undefined, undefined, 'welcome-reset-' + Date.now())]);
    showToast('Conversa reiniciada!', 'success');
  }, [awaitingProof, showToast]);

  useEffect(() => {
    const el = chatBottomRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) { }
    }
  }, [messages]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('payment-recharge', {
          body: { action: 'get_initial_data' },
        });
        if (!edgeError && edgeData) {
          if (typeof edgeData.userBalance === 'number') setUserBalance(edgeData.userBalance);
          if (typeof edgeData.totalRecharges === 'number') setTotalRecharges(edgeData.totalRecharges);
          if (Array.isArray(edgeData.banks) && edgeData.banks.length > 0) {
            setCollectionBanks(edgeData.banks);
            return edgeData.banks;
          }
        }
      } catch { }

      const { data: withdrawInfo } = await supabase.rpc('get_withdraw_info_mcpn');
      if (withdrawInfo && withdrawInfo.length > 0) {
        setUserBalance(Number(withdrawInfo[0].balance) || 0);
      }

      try {
        const { data: accData } = await supabase.rpc('get_my_account_data');
        if (accData && accData.length > 0) {
          setTotalRecharges(Number((accData[0] as any).total_recarregado ?? 0));
        } else {
          const { data: recData } = await supabase.from('recargas_mcpn').select('valor, status');
          if (recData) {
            const sum = recData
              .filter((r: any) => r.status === 'aprovado' || r.status === 'concluido')
              .reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);
            setTotalRecharges(sum);
          }
        }
      } catch { }

      const { data: banksData, error: banksError } = await supabase.rpc('get_collection_banks_mcpn');
      if (!banksError && banksData && Array.isArray(banksData)) {
        setCollectionBanks(banksData);
        return banksData;
      }
      return [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initChat() {
      await fetchData();

      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) { }

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: 'welcome-deposit',
            sender: 'bot',
            time: nowTime(),
            type: 'welcome',
          },
        ]);
      }, 100);
    }

    initChat();
  }, [fetchData]);

  const botReply = useCallback((builder: () => ChatMessage, delay = 0) => {
    if (delay === 0) {
      setMessages((prev) => [...prev, builder()]);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [...prev, builder()]);
      }, delay);
    }
  }, []);

  const cancelActiveRecharge = useCallback(async () => {
    const rechargeId = activeRechargeId || rechargeSession.get().rechargeId;
    if (!rechargeId) {
      showToast('Não foi possível identificar o pedido de recarga para cancelar.', 'error');
      return;
    }

    setIsTyping(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-recharge', {
        body: { action: 'cancel_recharge', recharge_id: rechargeId },
      });
      if (error) throw error;
      if (data?.success !== true) {
        throw new Error(data?.error || 'Não foi possível cancelar este pedido de recarga.');
      }

      rechargeSession.clear();
      setDepositAmount(null);
      setSelectedBank(null);
      setActiveRechargeId(null);
      setIsTyping(false);
      showToast('Pedido de recarga cancelado.', 'success');
      botReply(() => createBotMsg('text', 'O pedido de recarga foi cancelado. Quando quiser, podemos começar novamente com /depositar.'));
    } catch (error) {
      console.error('Erro ao cancelar pedido de recarga:', error);
      setIsTyping(false);
      showToast(error instanceof Error ? error.message : 'Não foi possível cancelar o pedido.', 'error');
      botReply(() => createBotMsg('text', 'Não consegui cancelar o pedido agora. O fluxo continua ativo; envia o comprovativo ou tenta cancelar novamente.'));
    }
  }, [activeRechargeId, botReply, showToast]);

  const copyToClipboard = async (text: string, isAmount = false) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (isAmount) {
        showToast(t('recharge.copy_toast'), 'success');
      } else {
        setCopiedIban(true);
        showToast(t('recharge.copy_toast'), 'success');
        setTimeout(() => setCopiedIban(false), 2000);
      }
    } catch {
      showToast('Falha ao copiar para a área de transferência.', 'error');
    }
  };

  const createRechargeOrder = useCallback(
    async (amount: number, bank: CollectionBank) => {
      try {
        setIsTyping(true);
        let recId: string | null = null;

        try {
          const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('payment-recharge', {
            body: {
              action: 'create_recharge',
              amount,
              bank_id: bank.id,
              bank_name: bank.nome_banco,
            },
          });
          if (!edgeErr && edgeRes?.rechargeId) {
            recId = edgeRes.rechargeId;
          }
        } catch { }

        if (!recId) {
          const { data } = (await supabase.rpc('request_recharge_kz_mcpn', {
            p_amount: amount,
            p_bank_id: bank.id,
          })) as { data: any; error: any };

          recId = data?.recharge_id || data?.id || (data && typeof data === 'string' ? data : null);

          if (!recId) {
            const { data: userAuth } = await supabase.auth.getUser();
            if (userAuth?.user) {
              const { data: latest } = await supabase
                .from('recargas_mcpn')
                .select('id')
                .eq('user_id', userAuth.user.id)
                .eq('status', 'pendente')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (latest?.id) {
                recId = latest.id;
              }
            }
          }
        }

        if (!recId) throw new Error('Não foi possível criar o pedido de recarga. Tenta novamente antes de fazer a transferência.');
        setActiveRechargeId(recId);
        rechargeSession.set(recId, amount, bank);

        setSelectedBank(bank);

        botReply(() =>
          createBotMsg('deposit_instructions', undefined, {
            amount,
            bank,
            rechargeId: recId,
          })
        );
      } catch (err: any) {
        setIsTyping(false);
        showToast(err.message || 'Falha ao gerar dados de pagamento.', 'error');
        botReply(() =>
          createBotMsg(
            'text',
            'Ops! Tivemos uma oscilação ao conectar com o banco. Por favor, tente clicar novamente no banco desejado 😊'
          )
        );
      }
    },
    [botReply, showToast]
  );

  const handleUploadProof = async (file: File) => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      showToast('Envia o comprovativo como imagem ou PDF.', 'error');
      return;
    }
    if (!awaitingProof || !(activeRechargeId || rechargeSession.get().rechargeId)) {
      showToast('Inicia uma recarga e seleciona o método de pagamento antes de enviar o comprovativo.', 'error');
      return;
    }
    if (isUploading) return;

    let imageUrl: string | undefined;
    if (isImage) {
      imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Não foi possível carregar a imagem selecionada.'));
        };
        reader.onerror = () => reject(new Error('Não foi possível carregar a imagem selecionada.'));
        reader.readAsDataURL(file);
      });
    }

    const userImgMsgId = 'usr-proof-' + Date.now();
    const userImgMsg: ChatMessage = {
      id: userImgMsgId,
      sender: 'user',
      time: nowTime(),
      text: isPdf ? '' : 'Comprovativo de depósito anexado 📸',
      imageUrl,
      ...(!isImage ? {
        attachment: {
          name: file.name,
          sizeBytes: file.size,
          mimeType: isPdf ? 'application/pdf' : (file.type || 'application/octet-stream')
        }
      } : {}),
      type: 'text',
    };
    setMessages((prev) => [...prev, userImgMsg]);

    setIsUploading(true);
    setIsTyping(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão expirada. Faça login novamente.');

      const targetRechargeId = activeRechargeId || rechargeSession.get().rechargeId;

      if (!targetRechargeId) {
        throw new Error('Não foi possível identificar o pedido de recarga. Por favor, envie /depositar para reiniciar.');
      }

      const fileExt = isPdf ? 'pdf' : (file.name.split('.').pop()?.toLowerCase() || (isImage ? 'jpg' : 'bin'));
      const mimeType = isPdf ? 'application/pdf' : (isImage ? 'image/jpeg' : (file.type || 'application/octet-stream'));

      const uploadPayload = isImage ? await compressImage(file) : file;
      const fileName = `${userData.user.id}/${targetRechargeId}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recargas')
        .upload(fileName, uploadPayload, { upsert: true, contentType: mimeType });

      if (uploadError) throw uploadError;
      if (!isImage) {
        setMessages((prev) => prev.map((message) =>
          message.id === userImgMsgId && message.attachment
            ? { ...message, attachment: { ...message.attachment, storagePath: uploadData.path } }
            : message
        ));
      }

      const bankName = selectedBank?.nome_banco || rechargeSession.get().bank?.nome_banco || collectionBanks[0]?.nome_banco || 'Depósito Bancário';

      let confirmedViaEdge = false;
      try {
        const { data: edgeConfirm, error: edgeErr } = await supabase.functions.invoke('payment-recharge', {
          body: {
            action: 'confirm_recharge',
            recharge_id: targetRechargeId,
            bank_name: bankName,
            image_path: uploadData.path,
          },
        });
        if (!edgeErr && edgeConfirm?.success) {
          confirmedViaEdge = true;
        }
      } catch { }

      if (!confirmedViaEdge) {
        const { data: confirmData, error: confirmError } = (await supabase.rpc('confirm_recharge_mcpn', {
          p_recharge_id: targetRechargeId,
          p_bank_name: bankName,
          p_image_path: uploadData.path,
        })) as { data: any; error: any };

        if (confirmError) throw confirmError;

        if (confirmData && typeof confirmData === 'object' && confirmData.success === false) {
          throw new Error(confirmData.message || 'Falha ao confirmar o comprovativo no servidor.');
        }
      }

      setIsTyping(false);
      showToast('Comprovativo enviado com sucesso!', 'success');

      botReply(() =>
        createBotMsg('proof_success', undefined, {
          amount: depositAmount || rechargeSession.get().amount || 3000,
          bankName,
        }, 'proof-ok')
      );

      setDepositAmount(null);
      setSelectedBank(null);
      setActiveRechargeId(null);
      rechargeSession.clear();
    } catch (err: any) {
      setIsTyping(false);
      showToast(err.message || 'Erro ao enviar comprovativo.', 'error');
      botReply(() =>
        createBotMsg(
          'text',
          'Erro ao enviar comprovativo: ' + (err.message || 'Falha de conexão.') + ' Tente anexar novamente ou envie /depositar.'
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const fetchRecentRecharges = useCallback(async () => {
    try {
      try {
        const { data: edgeHistory, error: edgeErr } = await supabase.functions.invoke('payment-recharge', {
          body: { action: 'get_history' },
        });
        if (!edgeErr && edgeHistory?.list && Array.isArray(edgeHistory.list) && edgeHistory.list.length > 0) {
          return edgeHistory.list.slice(0, 10);
        }
      } catch { }

      const { data, error } = await supabase.rpc('get_my_recharges_mcpn');
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.slice(0, 10);
      }

      const { data: userAuth } = await supabase.auth.getUser();
      if (userAuth?.user?.id) {
        const { data: tableData } = await supabase
          .from('recargas_mcpn')
          .select('*')
          .eq('user_id', userAuth.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (Array.isArray(tableData) && tableData.length > 0) {
          return tableData;
        }
      }

      const { data: genData } = await supabase.rpc('get_general_history_mcpn');
      if (Array.isArray(genData)) {
        const filtered = genData.filter((item: any) => item.type === 'recargas');
        if (filtered.length > 0) {
          return filtered.slice(0, 10);
        }
      }

      return [];
    } catch {
      return [];
    }
  }, []);

  const fetchDepositSummary = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userCreatedAt = userData?.user?.created_at || null;

      let recharges: any[] = [];
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_recharges_mcpn');
      if (!rpcError && Array.isArray(rpcData)) {
        recharges = rpcData;
      } else if (userData?.user?.id) {
        const { data: tableData } = await supabase
          .from('recargas_mcpn')
          .select('*')
          .eq('user_id', userData.user.id);
        if (tableData) recharges = tableData;
      }

      const sorted = [...recharges].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });

      const approved = sorted.filter((r) => {
        const st = (r.status || '').toLowerCase();
        return st === 'aprovado' || st === 'concluido' || st === 'approved' || st === 'completed';
      });

      const pending = sorted.filter((r) => {
        const st = (r.status || '').toLowerCase();
        return st === 'pendente' || st === 'pending';
      });

      const totalApprovedAmount = approved.reduce(
        (sum, r) => sum + (Number(r.amount) || Number(r.valor) || 0),
        0
      );

      return {
        userCreatedAt,
        totalDepositsCount: sorted.length,
        approvedDepositsCount: approved.length,
        pendingDepositsCount: pending.length,
        totalApprovedAmount,
        firstDeposit: approved[0] || sorted[0] || null,
        secondDeposit: approved[1] || (sorted.length > 1 ? sorted[1] : null),
        allApproved: approved,
        allSorted: sorted,
      };
    } catch {
      return null;
    }
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const rawInput = (textToSend || inputText).trim();
      if (!rawInput) return;

      const isPureNumeric = /^\d+$/.test(rawInput.replace(/[\s.,KZkz]/g, ''));
      const isSlashCmd = rawInput.startsWith('/');

      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: rawInput,
        type: 'text',
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText('');

      const cleanCmd = rawInput.toLowerCase().replace(/^\//, '').trim();

      const nlp = !isSlashCmd && !isPureNumeric ? parseDepositNaturalLanguage(rawInput) : null;
      const previousAssistantMessage = messages
        .slice()
        .reverse()
        .find((message) => message.sender === 'bot' && message.type === 'text')?.text || '';

      if (awaitingProof) {
        if (isCancelRechargeRequest(rawInput)) {
          await cancelActiveRecharge();
          return;
        }
        botReply(
          () => createBotMsg('text', 'Ainda estou a aguardar o comprovativo desta recarga. Envia uma imagem ou PDF, ou escreve “cancelar pedido” para cancelar a recarga.'),
          350
        );
        return;
      }

      if (['cancelar', 'cancela', 'sair', 'deixa'].includes(cleanCmd) || nlp?.intent === 'cancel') {
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        rechargeSession.clear();
        botReply(() => createBotMsg('text', 'Processo de depósito cancelado. Quando quiser recarregar, envie /depositar.'));
        return;
      }

      if (nlp?.intent === 'support') {
        setIsTyping(true);
        try {
          const { getPaymentAssistantResponse } = await import('./paymentAssistantCore');
          const response = getPaymentAssistantResponse(rawInput, previousAssistantMessage);
          setIsTyping(false);
          botReply(() => createBotMsg('text', response));
        } catch (error) {
          console.error('Erro ao carregar respostas locais do Playment Bot:', error);
          setIsTyping(false);
          botReply(() => createBotMsg('text', 'Compreendo a tua preocupação. Confirma o estado no /historico e, se necessário, contacta o suporte oficial. Não partilhes palavras-passe nem códigos.'));
        }
        return;
      }

      if (nlp?.intent === 'greeting') {
        setIsTyping(true);
        try {
          const { getPaymentAssistantResponse } = await import('./paymentAssistantCore');
          const response = getPaymentAssistantResponse(rawInput, previousAssistantMessage);
          setIsTyping(false);
          botReply(() => createBotMsg('text', response));
        } catch (error) {
          console.error('Erro ao carregar respostas locais do Playment Bot:', error);
          setIsTyping(false);
          botReply(() => createBotMsg('text', 'Olá! Como estás? Posso ajudar-te com recargas, saldo ou comprovativos.'));
        }
        return;
      }

      if (
        (isSlashCmd && ['start', 'inicio', 'início', 'ajuda', 'help', 'menu'].includes(cleanCmd)) ||
        ['/start', '/inicio', '/início', '/ajuda', '/help', '/menu'].includes(rawInput.toLowerCase()) ||
        nlp?.intent === 'help'
      ) {
        botReply(() => createBotMsg('welcome'));
        return;
      }

      if (
        (isSlashCmd && ['saldo', 'carteira', 'versaldo', 'meusaldo'].includes(cleanCmd)) ||
        nlp?.intent === 'balance'
      ) {
        setIsTyping(true);
        try {
          const { data: wi } = await supabase.rpc('get_withdraw_info_mcpn');
          const realBalance = (wi && wi.length > 0) ? Number(wi[0].balance) || 0 : userBalance;
          setUserBalance(realBalance);
          setIsTyping(false);
          botReply(() => createBotMsg('text', `Seu saldo é de ${formatCurrency(realBalance, 'KZ')}. Para recarregar, envie /depositar ou digite o valor (ex: depositar 1000).`));
        } catch {
          setIsTyping(false);
          botReply(() => createBotMsg('text', `Seu saldo é de ${formatCurrency(userBalance, 'KZ')}. Para recarregar, envie /depositar.`));
        }
        return;
      }

      if ((isSlashCmd && ['bancos', 'banco', 'contas'].includes(cleanCmd)) || nlp?.intent === 'banks') {
        const banksText = collectionBanks.length > 0
          ? collectionBanks.map((b, i) => `${i + 1}. ${b.nome_banco} | Titular: ${b.nome_proprietario} | IBAN: ${b.iban}`).join('\n')
          : 'Nenhum banco disponível no momento.';
        botReply(() => createBotMsg('text', `Bancos disponíveis para recarga:\n\n${banksText}\n\nPara iniciar um depósito, envie /depositar.`));
        return;
      }

      if ((isSlashCmd && ['horario', 'horarios'].includes(cleanCmd)) || nlp?.intent === 'schedule') {
        botReply(() => createBotMsg('text', 'Os depósitos funcionam 24 horas por dia, 7 dias por semana.'));
        return;
      }

      if ((isSlashCmd && ['limites', 'regras', 'taxa', 'taxas', 'info'].includes(cleanCmd)) || nlp?.intent === 'limits') {
        botReply(() => createBotMsg('text', `Regras de depósito: Mínimo: ${formatCurrency(MIN_RECHARGE, 'KZ')}. Máximo: ${formatCurrency(MAX_RECHARGE, 'KZ')}. Taxa: 0%. Horário: 24h.`));
        return;
      }

      const isTotalDepositCmd = isSlashCmd && [
        'total', 'total_deposito', 'total_depositos', 'totaldeposito',
        'totaldepositos', 'extrato', 'meus_depositos', 'relatorio', 'relatório',
      ].includes(cleanCmd);

      if (isTotalDepositCmd || nlp?.intent === 'total') {
        setIsTyping(true);
        const summary = await fetchDepositSummary();
        setIsTyping(false);

        if (!summary) {
          botReply(() => createBotMsg('text', 'Não foi possível consultar o relatório no momento. Tente novamente em instantes.'));
          return;
        }

        const count = summary.approvedDepositsCount;
        const totalStr = formatCurrency(summary.totalApprovedAmount, 'KZ');
        const reportText = count > 0
          ? `Relatório de depósitos: ${count} depósito(s) confirmado(s), total de ${totalStr}. Para recarregar, envie /depositar.`
          : `Relatório de depósitos: Nenhum depósito confirmado até o momento. Para fazer sua primeira recarga, envie /depositar.`;

        botReply(() => createBotMsg('text', reportText));
        return;
      }

      if ((isSlashCmd && ['historico', 'registos'].includes(cleanCmd)) || nlp?.intent === 'history') {
        setIsTyping(true);
        const recentList = await fetchRecentRecharges();
        setIsTyping(false);

        let histText = '';
        if (recentList && recentList.length > 0) {
          const items = recentList.map((item: any, idx: number) => {
            const val = formatCurrency(Number(item.amount) || Number(item.valor) || 0, 'KZ');
            const { label: statusLabel } = formatStatus(item.status);
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'Recente';
            const bankStr = item.banco_origem || item.bank_name || 'Transferência';
            return `${idx + 1}. ${val} | ${statusLabel} | ${dateStr} | ${bankStr}`;
          }).join('\n');
          histText = `Histórico de Depósitos (${recentList.length} registos):\n\n${items}\n\nPara fazer uma nova recarga, envie /depositar.`;
        } else {
          histText = 'Histórico de Depósitos:\nNenhum depósito registado na sua conta. Para recarregar, envie /depositar.';
        }
        botReply(() => createBotMsg('text', histText));
        return;
      }

      if (isSlashCmd && ['limpar', 'reset', 'clear'].includes(cleanCmd)) {
        restartConversation();
        return;
      }

      if (
        (isSlashCmd && ['depositar', 'recarregar', 'deposito', 'recarga'].includes(cleanCmd)) ||
        (nlp?.intent === 'deposit' && !nlp.amount)
      ) {
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        botReply(() => createBotMsg('amount_selector', `Qual valor deseja depositar? Digite o valor ou escolha uma opção abaixo (Mínimo: ${formatCurrency(MIN_RECHARGE, 'KZ')}, Máximo: ${formatCurrency(MAX_RECHARGE, 'KZ')}):`));
        return;
      }

      if (nlp?.intent === 'deposit' && nlp.amount) {
        const amtValidation = validateRechargeAmount(nlp.amount, t);
        if (!amtValidation.valid) {
          botReply(() => createBotMsg('text', amtValidation.errorText));
          return;
        }
        setDepositAmount(nlp.amount);
        botReply(() => createBotMsg('bank_selector',
          `Olá, por favor, selecione o método de pagamento para concluir a transferência de ${formatCurrency(nlp.amount!, 'KZ')}.`,
          { amount: nlp.amount, banks: collectionBanks }
        ));
        return;
      }

      const matchedBank = collectionBanks.find(
        (b) =>
          cleanCmd === b.nome_banco.toLowerCase() ||
          cleanCmd.includes(b.nome_banco.toLowerCase()) ||
          cleanCmd === b.id.toLowerCase()
      );

      if (matchedBank && depositAmount !== null) {
        createRechargeOrder(depositAmount, matchedBank);
        return;
      }

      const numericVal = parseInt(cleanCmd.replace(/\D/g, ''), 10);
      if (isPureNumeric && !isNaN(numericVal) && numericVal > 0) {
        const numValidation = validateRechargeAmount(numericVal, t);
        if (!numValidation.valid) {
          botReply(() => createBotMsg('text', numValidation.errorText));
          return;
        }
        setDepositAmount(numericVal);
        botReply(() => createBotMsg('bank_selector',
          `Olá, por favor, selecione o método de pagamento para concluir a transferência de ${formatCurrency(numericVal, 'KZ')}.`,
          { amount: numericVal, banks: collectionBanks }
        ));
        return;
      }

      try {
        setIsTyping(true);
        const { getPaymentAssistantResponse } = await import('./paymentAssistantCore');
        const response = getPaymentAssistantResponse(rawInput, previousAssistantMessage);
        setIsTyping(false);
        botReply(() => createBotMsg('text', response));
      } catch (error) {
        console.error('Erro ao carregar respostas locais do Playment Bot:', error);
        setIsTyping(false);
        botReply(() => createBotMsg('text', 'Não consegui preparar uma resposta agora. Podes consultar o /historico ou escolher uma opção de recarga.'));
      }
    },
    [
      inputText,
      messages,
      userBalance,
      collectionBanks,
      depositAmount,
      botReply,
      showToast,
      createRechargeOrder,
      fetchRecentRecharges,
      fetchDepositSummary,
      restartConversation,
      awaitingProof,
      cancelActiveRecharge,
      t,
    ]
  );

  const renderBotText = useCallback(
    (text: string) => <BotFormattedText text={text} onCommandClick={handleSendMessage} />,
    [handleSendMessage]
  );

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none transition-colors"
      style={{ 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif",
        backgroundColor: '#afc8af',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      <input type="file" ref={photoInputRef} accept="image/*" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadProof(file); e.target.value = ''; }}
      />
      <input type="file" ref={fileDocInputRef} accept="image/*,.pdf" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadProof(file); e.target.value = ''; }}
      />
      <input type="file" ref={fileInputRef} accept="image/*,.pdf" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadProof(file); e.target.value = ''; }}
      />

      <header className="w-full bg-transparent px-3 sm:px-4 py-3 sticky top-0 z-40 flex items-center justify-between select-none pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto"
          aria-label={t('common.back')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>

        <div className="flex w-0 flex-1 items-center gap-2.5 bg-white rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 pointer-events-auto">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
            <img src="/logo_bussiness_messeger.jpg" alt="Messenger TopUp" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[15px] font-bold text-black tracking-tight truncate leading-[1.15] mt-0.5">
              Messenger TopUp
              </h1>
              <span className="w-3.5 h-3.5 rounded-full bg-[#2481cc] text-white flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5">✓</span>
            </div>
            <span className="mt-0.5 flex items-center gap-1 text-[12px] font-normal leading-[1.15] text-[#25ae60]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#25ae60]" />
              {t('chat.online_now')}
            </span>
          </div>
        </div>

        <div className="relative pointer-events-auto">
          <button
            onClick={() => setShowMenuDropdown((prev) => !prev)}
            className="w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black hover:bg-gray-50 active:scale-95 transition-transform shrink-0"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenuDropdown && (
            <div
              className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-[13.5px] text-gray-800 animate-in fade-in zoom-in-95 duration-100"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
            >
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/saldo');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-[#3390ec]" />
                <span>{t('recharge.check_balance')}</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/depositar');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#25ae60]" />
                <span>{t('recharge.start_deposit')}</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/bancos');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#e67e22]" />
                <span>{t('recharge.available_banks')}</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/horario');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-[#3498db]" />
                <span>{t('recharge.schedule')}</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/historico');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#8e44ad]" />
                <span>{t('recharge.history_title')}</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/total_deposito');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-[#10b981]" />
                <span>{t('recharge.total_deposits')}</span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/limpar');
                }}
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-red-500" />
                <span>{t('recharge.clear_conversation')}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── CORPO DO CHAT ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        onClick={() => setShowMenuDropdown(false)}
        className="flex-1 overflow-y-auto px-2.5 pt-2 pb-24 space-y-1 relative select-text"
      >
        <div className="flex justify-center my-1 select-none">
          <span
            className="text-white text-[11.5px] font-medium px-3 py-0.5 rounded-full shadow-xs"
            style={{ background: 'rgba(91,122,94,0.7)' }}
          >
            {getCurrentDay()}
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const ibanReference = msg.type === 'deposit_instructions'
            ? String(msg.payload?.bank?.iban || '').replace(/^AO\d{2}/i, '')
            : '';
          if (isUser) {
            const isCmd = msg.text?.trim().startsWith('/');
            const isValid = isCmd && isRecognizedCommand(msg.text || '');
            return (
              <div key={msg.id} className="flex flex-col items-end mb-1.5 pr-2">
                <div className="relative max-w-[80%]">
                  <div
                    className="bg-[#eeffde] rounded-[16px] rounded-br-none px-[10px] pt-[6px] pb-[6px] select-text relative"
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Comprovativo"
                        className="rounded-lg max-h-48 w-auto object-cover mt-1 mb-1 block"
                      />
                    )}
                    {msg.attachment && (
                      <div className="my-1 flex min-w-0 items-center gap-2 rounded-[10px] bg-black/5 px-2.5 py-2">
                        {msg.attachment.mimeType === 'application/pdf' ? (
                          <PdfDownloadCard
                            name={msg.attachment.name}
                            sizeBytes={msg.attachment.sizeBytes}
                            disabled={!msg.attachment.storagePath}
                            resolveUrl={msg.attachment.storagePath
                              ? async () => {
                                  const { data, error } = await supabase.storage
                                    .from('recargas')
                                    .createSignedUrl(msg.attachment!.storagePath!, 60);
                                  if (error || !data?.signedUrl) {
                                    throw error || new Error('Não foi possível preparar o download do PDF.');
                                  }
                                  return data.signedUrl;
                                }
                              : undefined}
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-[#74808b] text-white">
                            <FileText className="h-5 w-5" />
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[11px] font-medium text-gray-500">
                            Ficheiro: {formatFileSize(msg.attachment.sizeBytes)}
                          </span>
                          <span className="max-w-full truncate text-[13px] font-medium text-gray-900">
                            {msg.attachment.name}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="relative leading-[1.3] pointer-events-none">
                      <span
                        className={`text-[16px] whitespace-pre-wrap break-words font-normal ${isValid ? 'text-[#1a7ac7]' : 'text-black'}`}
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {msg.text}
                      </span>
                      <span aria-hidden="true" className="inline-block h-[1px]" style={{ width: '56px' }} />
                      <div className="absolute bottom-[-1px] right-0 flex items-center gap-[2px] select-none text-[12px]">
                        <span className="font-normal leading-none text-[#55864e]">{msg.time}</span>
                        <span className="text-[#4fae4e] font-bold text-[11px] leading-none">✓✓</span>
                      </div>
                    </div>
                  </div>
                  <svg
                    width="9"
                    height="20"
                    viewBox="0 0 9 20"
                    className="absolute"
                    style={{ bottom: 0, right: -8, fill: '#eeffde' }}
                  >
                    <path d="M0 20H9C4.5 20 1 16 0 8V20Z" />
                  </svg>
                </div>
              </div>
            );
          }

          const hasKeyboard = ['welcome', 'deposit_instructions', 'deposit_summary', 'proof_success'].includes(msg.type);

          return (
            <React.Fragment key={msg.id}>
              <div
                className="flex flex-col items-start mb-2 max-w-[88%] sm:max-w-[80%] pl-2"
              >
                <div className="relative w-full">
                  <svg
                    width="9"
                    height="20"
                    viewBox="0 0 9 20"
                    className="absolute"
                    style={{ top: 0, left: -8, fill: 'white' }}
                  >
                    <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
                  </svg>
                  <div
                    className={`bg-white text-gray-900 w-full relative select-text px-3.5 py-2.5 ${hasKeyboard ? 'rounded-tr-[16px] rounded-tl-none rounded-b-none' : 'rounded-[16px] rounded-tl-none'
                      }`}
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    {/* APRESENTAÇÃO INICIAL / BOAS-VINDAS */}
                    {msg.type === 'welcome' && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        <p>
                          Olá! Sou o assistente de recargas. Tudo bem? Como posso ajudar hoje?
                        </p>
                      </div>
                    )}

                    {/* TEXTO BOT PADRÃO */}
                    {msg.type === 'text' && msg.text && (
                      <div className="text-[14px] text-black leading-relaxed font-normal">
                        {renderBotText(msg.text)}
                      </div>
                    )}

                    {/* SELETOR DE VALORES RÁPIDOS */}
                    {msg.type === 'amount_selector' && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        {msg.text && renderBotText(msg.text)}
                        <div className="mt-3 flex flex-wrap gap-1.5 select-none">
                          {[3000, 5000, 10000, 20000, 50000, 100000].map((val) => (
                            <button
                              key={val}
                              onClick={() => handleSendMessage(String(val))}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[#2481cc] text-[13px] font-semibold hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
                            >
                              {formatCurrency(val, 'KZ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SELETOR DE BANCOS DISPONÍVEIS */}
                    {msg.type === 'bank_selector' && msg.payload && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        {msg.text && renderBotText(msg.text)}
                        <div className="mt-3 flex flex-col select-none">
                          {msg.payload.banks && msg.payload.banks.length > 0 ? (
                            msg.payload.banks.map((b: CollectionBank) => (
                              <button
                                key={b.id}
                                onClick={() => createRechargeOrder(msg.payload.amount, b)}
                                className="w-full text-left py-1.5 flex items-center justify-between text-[14px] text-gray-900 hover:text-[#2481cc] active:text-[#1f72b5] transition-colors cursor-pointer"
                              >
                                <span>{b.nome_banco}</span>
                                <span className="text-[12px] text-[#3390ec]">{t('recharge.select_bank')}</span>
                              </button>
                            ))
                          ) : (
                            <p className="py-1.5 text-[13px] text-gray-600">{t('recharge.no_banks_available')}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => botReply(() => createBotMsg(
                              'text',
                              'O pagamento via Multicaixa Express está em preparação e ficará disponível em breve.'
                            ))}
                            className="w-full text-left py-1.5 flex items-center justify-between text-[14px] text-gray-900 hover:text-[#2481cc] active:text-[#1f72b5] transition-colors cursor-pointer"
                          >
                            <span>{t('recharge.multicaixa_express')}</span>
                            <span className="text-[11px] font-medium text-gray-500 text-right">{t('common.coming_soon')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => botReply(() => createBotMsg(
                              'text',
                              'O pagamento com carteira digital USDT está em preparação e ficará disponível em breve. Não envie fundos para um endereço que não tenha sido fornecido oficialmente.'
                            ))}
                            className="w-full text-left py-1.5 flex items-center justify-between text-[14px] text-gray-900 hover:text-[#2481cc] active:text-[#1f72b5] transition-colors cursor-pointer"
                          >
                            <span>{t('recharge.usdt_wallet')}</span>
                            <span className="text-[11px] font-medium text-gray-500 text-right">{t('common.coming_soon')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {msg.type === 'deposit_instructions' && msg.payload && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                          Dados para transferência
                        </p>
                        <div className="text-[13.5px] space-y-2 my-2">
                          <div>
                            <p>
                              Por favor, conclua a transferência para <strong className="font-bold text-[#2481cc]">{msg.payload.bank?.nome_proprietario || 'Conta Oficial'}</strong>
                              {' '}no banco <strong className="font-bold text-[#2481cc]">{msg.payload.bank?.nome_banco}</strong>, no valor de{' '}
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <strong className="text-[#dc2626] text-[15px]">{formatCurrency(msg.payload.amount, 'KZ')}</strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(String(msg.payload.amount), true)}
                                  className="text-[#2481cc] hover:text-[#1f72b5] cursor-pointer"
                                  title={t('common.copy')}
                                  aria-label={`${t('common.copy')} ${formatCurrency(msg.payload.amount, 'KZ')}`}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </span>.
                            </p>
                          </div>

                          <div className="flex items-start gap-2">
                            <p className="min-w-0 break-all">
                              <strong>Referência (IBAN):</strong>{' '}
                              <strong className="select-all font-bold text-[#2481cc]">{ibanReference}</strong>
                            </p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(ibanReference, false)}
                              className="mt-0.5 shrink-0 text-[#2481cc] hover:text-[#1f72b5] cursor-pointer"
                              title={copiedIban ? 'Referência copiada' : 'Copiar referência'}
                              aria-label={copiedIban ? 'Referência copiada' : 'Copiar referência'}
                            >
                              {copiedIban ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-[13px] text-gray-800 leading-normal italic">
                          Dirija-se a um ATM ou use o aplicativo do seu banco para concluir a transferência.
                          {' '}Depois, envie aqui uma captura do comprovativo.
                        </p>
                      </div>
                    )}

                    {msg.type === 'deposit_instructions' && msg.payload && awaitingProof && msg.payload.rechargeId === activeRechargeId && (
                      <div className="mt-3 grid grid-cols-2 gap-2 select-none">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="rounded-lg bg-[#2481cc] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#1f72b5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Enviar comprovativo
                        </button>
                        <button
                          type="button"
                          onClick={() => void cancelActiveRecharge()}
                          disabled={isUploading || isTyping}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancelar depósito
                        </button>
                      </div>
                    )}

                    {msg.type === 'proof_success' && msg.payload && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        <p className="font-bold text-[15px] text-[#25ae60] mb-1.5">
                          Recebido com muito sucesso! 🎉🥳
                        </p>
                        <p className="text-[13.5px] text-gray-800 leading-normal">
                          O teu comprovativo foi recebido e enviado para conferência. Depois da aprovação, o valor de{' '}
                          <strong>{formatCurrency(msg.payload.amount || 0, 'KZ')}</strong> ficará disponível no saldo.
                          Acompanha o estado em <strong>/historico</strong>; quando aparecer como aprovado, confirma o saldo com <strong>/saldo</strong>.
                        </p>
                      </div>
                    )}

                    {msg.type === 'banks_list' && msg.payload && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                          🏦 {t('recharge.available_banks')}
                        </p>
                        <div className="space-y-2 my-2">
                          {msg.payload.banks && msg.payload.banks.length > 0 ? (
                            msg.payload.banks.map((b: CollectionBank) => (
                              <div key={b.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[13px]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-black text-[14px]">{b.nome_banco}</span>
                                  <span className="text-[11px] text-[#25ae60] font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                    Disponível 24h
                                  </span>
                                </div>
                                <p className="text-gray-600 text-[12.5px]">Titular: {b.nome_proprietario}</p>
                                <p className="text-[#2481cc] font-mono text-[12px] mt-0.5 select-all break-all">
                                  IBAN: {b.iban}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[13px] text-gray-600">{t('recharge.no_banks_registered')}</p>
                          )}
                        </div>
                        <p className="text-[13px] text-gray-700">
                          Quando quiser iniciar seu depósito, envie /depositar 😊
                        </p>
                      </div>
                    )}

                    {msg.type === 'history_list' && msg.payload && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        <p className="font-bold text-[15px] text-[#2481cc] mb-1.5">
                          📑 Seus Últimos Depósitos:
                        </p>
                        {msg.payload.list && msg.payload.list.length > 0 ? (
                          <div className="space-y-1.5 mt-2">
                            {msg.payload.list.map((item: any, idx: number) => {
                              const { label: statusLabel, badgeClass } = formatStatus(item.status);
                              return (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-[13px]"
                                >
                                  <div>
                                    <span className="font-semibold text-black">
                                      {formatCurrency(Number(item.amount) || Number(item.valor) || 0, 'KZ')}
                                    </span>
                                    <span className="text-[11px] text-gray-500 block">
                                      {item.created_at
                                        ? new Date(item.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                        : 'Recente'}
                                    </span>
                                  </div>
                                  <span className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[13px] text-gray-600">
                            Você ainda não possui nenhum depósito registrado 😊
                          </p>
                        )}
                      </div>
                    )}

                    {msg.type === 'deposit_summary' && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        {msg.text && renderBotText(msg.text)}
                      </div>
                    )}

                    <div className="flex justify-end mt-1 text-[11px] text-[#8a8a8a] font-normal select-none">
                      <span>{msg.time}</span>
                    </div>
                  </div>

                  {msg.type === 'deposit_instructions' && msg.payload && (
                    <div className="w-full flex flex-col items-center justify-center gap-[2px] mt-[2px] select-none">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-4 py-2.5 text-[14px] font-medium active:scale-[0.99] transition-all disabled:opacity-50 w-full flex items-center justify-center gap-1.5 cursor-pointer rounded-none"
                      >
                        {isUploading ? '⏳ Enviando...' : '📷 Enviar Comprovativo'}
                      </button>
                      <button
                        onClick={() => handleSendMessage('/cancelar')}
                        className="bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-4 py-2.5 text-[14px] font-medium active:scale-[0.99] transition-all w-full flex items-center justify-center gap-1.5 cursor-pointer rounded-b-[16px] rounded-t-none"
                      >
                        ✕ Cancelar Depósito
                      </button>
                    </div>
                  )}

                  {msg.type === 'deposit_summary' && (
                    <div className="w-full flex items-center gap-[2px] mt-[2px] select-none">
                      <button onClick={() => handleSendMessage('/depositar')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-2 py-2.5 text-[13px] font-medium active:scale-[0.99] transition-all cursor-pointer rounded-bl-[16px] rounded-br-none rounded-t-none">💳 Fazer Depósito</button>
                      <button onClick={() => handleSendMessage('/saldo')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-2 py-2.5 text-[13px] font-medium active:scale-[0.99] transition-all cursor-pointer rounded-br-[16px] rounded-bl-none rounded-t-none">💰 Ver Saldo</button>
                    </div>
                  )}

                  {msg.type === 'proof_success' && (
                    <div className="w-full flex items-center gap-[2px] mt-[2px] select-none">
                      <button onClick={() => handleSendMessage('/depositar')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-2 py-2.5 text-[13px] font-medium active:scale-[0.99] transition-all cursor-pointer rounded-bl-[16px] rounded-br-none rounded-t-none">💳 Novo Depósito</button>
                      <button onClick={() => handleSendMessage('/historico')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-2 py-2.5 text-[13px] font-medium active:scale-[0.99] transition-all cursor-pointer rounded-br-[16px] rounded-bl-none rounded-t-none">📋 Histórico</button>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {awaitingProof && !isTyping && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="flex items-center gap-1.5 rounded-[16px] rounded-bl-[3px] bg-white px-3.5 py-2 shadow-xs">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#707579]" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#707579]" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#707579]" style={{ animationDelay: '300ms' }} />
              <span className="ml-1 text-[11.5px] text-[#707579]">{t('recharge.waiting_for_proof')}</span>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2 flex items-center gap-1.5 shadow-xs"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
              <span className="text-[11.5px] text-[#707579] ml-1">Payments Bot {t('chat.typing')}</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {showScrollDown && (
        <button
          onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute right-3.5 bottom-16 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#707579] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer shadow-md"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── QUICK HINTS (RESPOSTAS RÁPIDAS / COMANDOS) ── */}
      {showQuickHints && (
        <div className="fixed bottom-[65px] left-0 right-0 flex justify-center px-2 sm:px-6 z-40 animate-in slide-in-from-bottom-2">
          <div className="w-full max-w-[650px] bg-white dark:bg-[#17212b] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-semibold text-[#2481cc] uppercase">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Comandos Rápidos (Payments Bot)
              </span>
              <button
                type="button"
                onClick={() => setShowQuickHints(false)}
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
                  setShowQuickHints(false);
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

      {/* ── FOOTER FLUTUANTE IDÊNTICO AO OFFICIAL CHANNEL ── */}
      <footer className="fixed bottom-0 left-0 right-0 p-2 pb-[max(12px,env(safe-area-inset-bottom,12px))] z-40 flex justify-center bg-transparent pointer-events-none">
        <div className="w-full max-w-[650px] flex items-center gap-1.5 sm:gap-2 pointer-events-auto px-1 sm:px-2">

          {/* Cápsula branca flutuante sobre o wallpaper */}
          <div className="flex-1 min-w-0 bg-white dark:bg-[#182533] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-2.5 sm:px-3 py-1.5 min-h-[48px] border border-black/5 dark:border-white/10 transition-colors">

            {/* ⚡ Comandos Rápidos (mantido no lado esquerdo) */}
            <button
              type="button"
              onClick={() => setShowQuickHints(!showQuickHints)}
              className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 mr-1.5 ${
                showQuickHints ? 'text-[#2481cc] bg-[#2481cc]/15' : 'text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc]'
              }`}
              title="Comandos Rápidos"
            >
              <Zap className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={restartConversation}
              className="text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] p-1 shrink-0 transition-colors"
              title="Reiniciar conversa"
              aria-label="Reiniciar conversa"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Campo de texto */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                awaitingProof
                  ? 'Envia o comprovativo ou escreve “cancelar pedido”...'
                  : depositAmount !== null && !selectedBank
                  ? 'Nome do banco...'
                  : t('chat.input_placeholder')
              }
              className="flex-1 min-w-0 w-0 px-1 py-1 text-[14.5px] sm:text-[15px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#8e8e93] dark:placeholder:text-gray-400 font-normal leading-snug"
            />

            {/* 📎 Ícone de Ficheiros */}
            <button
              type="button"
              onClick={() => fileDocInputRef.current?.click()}
              className="text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 ml-1"
              title={t('recharge.proof_label')}
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* 📷 Ícone de Câmara (Fotos / Galeria no lado direito) */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 ml-0.5"
              title="Tirar foto ou escolher da galeria"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {/* Botão circular azul Telegram */}
          <button
            onClick={() => handleSendMessage()}
            className="w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] rounded-full text-white bg-[#2481cc] hover:bg-[#1f72b5] flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(36,129,204,0.4)] cursor-pointer"
            aria-label={t('common.send')}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
