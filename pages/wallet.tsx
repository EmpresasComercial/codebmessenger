import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreVertical, 
  Send, 
  Loader2, 
  HelpCircle, 
  ChevronDown, 
  ExternalLink,
  PlusCircle,
  Clock,
  Wallet,
  Building2,
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowDownLeft,
  Zap
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';

const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 100000;
const FEE_PERCENT = 10;
const CHAT_STORAGE_KEY = 'telegram_withdraw_bot_v2';

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/saldo', '/carteira',
  '/retirar', '/sacar', '/retirada', '/saque',
  '/banco', '/iban', '/conta',
  '/horario', '/horarios',
  '/taxa', '/taxas', '/limites', '/regras',
  '/historico', '/registos', '/extrato',
  '/limpar', '/reset', '/clear',
  '/cancelar', '/confirmar'
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd);
}

function parseNaturalLanguage(rawInput: string): {
  intent: 'balance' | 'withdraw' | 'history' | 'bank' | 'schedule' | 'fees' | 'help' | 'clear' | 'cancel' | 'confirm' | 'greeting' | 'unknown';
  amount?: number;
  isAll?: boolean;
} {
  const clean = rawInput.trim();
  const lower = clean.toLowerCase();
  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1. Confirmar
  if (
    norm === '/confirmar' ||
    ['sim', 'confirmar', 'confirma', 'confirmado', 'quero', 'yes', 's', 'ok', 'prosseguir', 'avancar', 'pode ser', 'pode mandar', 'exato', 'com certeza', 'claro'].includes(norm)
  ) {
    return { intent: 'confirm' };
  }

  // 2. Cancelar
  if (
    norm === '/cancelar' ||
    ['cancelar', 'cancela', 'cancelado', 'nao', 'abortar', 'deixa', 'deixa pra la', 'desistir', 'esquece', 'voltar', 'sair'].includes(norm)
  ) {
    return { intent: 'cancel' };
  }

  // 3. Limpar / Reset
  if (
    norm === '/limpar' || norm === '/reset' || norm === '/clear' ||
    ['limpar', 'reset', 'clear', 'limpar chat', 'limpar conversa', 'apagar conversa', 'reiniciar'].includes(norm)
  ) {
    return { intent: 'clear' };
  }

  // 4. Saudações conversacionais
  const greetings = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'e ai', 'tudo bem', 'tudo bom', 'como vai', 'fala', 'alo'];
  if (greetings.includes(norm) || greetings.some(g => norm.startsWith(g + ' ') || norm.endsWith(' ' + g))) {
    return { intent: 'greeting' };
  }

  // 5. Saldo em tempo real (consultas conversacionais e comandos)
  if (
    norm === '/saldo' || norm === '/carteira' ||
    norm.includes('saldo') || norm.includes('carteira') ||
    norm.includes('quanto tenho') || norm.includes('quanto eu tenho') ||
    norm.includes('meu dinheiro') || norm.includes('dinheiro na conta') ||
    norm.includes('ver saldo') || norm.includes('consultar saldo') ||
    norm.includes('mostrar saldo') || norm.includes('quanto sobrou') ||
    norm.includes('quanto posso') || norm.includes('meu saldo') ||
    norm.includes('saldo disponivel') || norm.includes('saldo atual')
  ) {
    return { intent: 'balance' };
  }

  // 6. Histórico de retiradas real (consultas conversacionais e comandos)
  if (
    norm === '/historico' || norm === '/registos' || norm === '/extrato' ||
    norm.includes('historico') || norm.includes('extrato') ||
    norm.includes('meus saques') || norm.includes('minhas retiradas') ||
    norm.includes('ver historico') || norm.includes('ultimos saques') ||
    norm.includes('ultimas retiradas') || norm.includes('registos') ||
    norm.includes('pedidos de retirada') || norm.includes('registro de retirada') ||
    norm.includes('saques anteriores') || norm.includes('status do meu saque') ||
    norm.includes('consultar historico') || norm.includes('ver retiradas') ||
    norm.includes('meu saque caiu') || norm.includes('onde esta meu saque')
  ) {
    return { intent: 'history' };
  }

  // 7. Dados bancários / Conta
  if (
    norm === '/banco' || norm === '/iban' || norm === '/conta' ||
    norm.includes('meu banco') || norm.includes('minha conta') ||
    norm.includes('qual meu banco') || norm.includes('qual meu iban') ||
    norm.includes('dados bancarios') || norm.includes('conta cadastrada') ||
    norm.includes('cadastrar banco') || norm.includes('trocar banco') ||
    norm.includes('mudar banco') || norm.includes('meu iban') ||
    norm.includes('adicionar banco')
  ) {
    return { intent: 'bank' };
  }

  // 8. Horário de funcionamento
  if (
    norm === '/horario' || norm === '/horarios' ||
    norm.includes('horario') || norm.includes('que horas') ||
    norm.includes('ta aberto') || norm.includes('esta aberto') ||
    norm.includes('quando abre') || norm.includes('quando fecha') ||
    norm.includes('atendimento') || norm.includes('funciona hoje') ||
    norm.includes('posso sacar agora') || norm.includes('ta fechado') || norm.includes('esta fechado')
  ) {
    return { intent: 'schedule' };
  }

  // 9. Taxas, regras e limites
  if (
    norm === '/taxa' || norm === '/taxas' || norm === '/limites' || norm === '/regras' ||
    norm.includes('taxa') || norm.includes('qual a taxa') ||
    norm.includes('quanto desconta') || norm.includes('limite') ||
    norm.includes('regras') || norm.includes('valor minimo') ||
    norm.includes('valor maximo') || norm.includes('qual o minimo') ||
    norm.includes('quanto posso sacar') || norm.includes('minimo de saque')
  ) {
    return { intent: 'fees' };
  }

  // 10. Retirar tudo / Saldo total
  if (
    norm.includes('sacar tudo') || norm.includes('retirar tudo') ||
    norm.includes('saldo total') || norm.includes('levantar tudo') ||
    norm.includes('todo o saldo') || norm.includes('todo meu saldo')
  ) {
    return { intent: 'withdraw', isAll: true };
  }

  // 11. Saque com extração inteligente de valor
  const withdrawTriggers = ['sacar', 'retirar', 'levantar', 'saque', 'retirada', 'quero', 'pedir', 'tirar', 'fazer', 'manda', 'enviar'];
  const hasWithdrawWord = withdrawTriggers.some(w => norm.includes(w)) || norm.startsWith('/retirar') || norm.startsWith('/sacar');

  // Regex para capturar números digitados (ex: 500, 1.000, 2500 kz, sacar 300)
  const numberMatch = norm.match(/(?:(?:kz|ao|akz)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:kz|kwanza|reais|ao|akz))?/i);
  if (numberMatch && (hasWithdrawWord || /^\d+$/.test(clean.replace(/[\s.,]/g, '')))) {
    const rawVal = numberMatch[1].replace(/\./g, '').replace(',', '.');
    const parsedAmt = Math.floor(parseFloat(rawVal));
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      return { intent: 'withdraw', amount: parsedAmt };
    }
  }

  if (hasWithdrawWord) {
    return { intent: 'withdraw' };
  }

  // 12. Ajuda / Boas-vindas
  if (
    norm === '/ajuda' || norm === '/help' || norm === '/menu' || norm === '/start' || norm === '/inicio' ||
    ['ajuda', 'help', 'menu', 'inicio', 'start', 'como funciona', 'o que voce faz', 'comandos', 'instrucoes'].includes(norm)
  ) {
    return { intent: 'help' };
  }

  return { intent: 'unknown' };
}

const isWithdrawAllowed = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};

const getWithdrawScheduleStatus = (): { isOpen: boolean; text: string } => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  if (isOpen) {
    return { isOpen: true, text: 'Aberto agora — Seg a Sex, 09:00 às 18:00' };
  }
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return { 
    isOpen: false, 
    text: `Fechado agora (${dayNames[day]}, ${String(hour).padStart(2, '0')}h) — Retorna Seg a Sex, 09:00 às 18:00` 
  };
};

interface WithdrawInfo {
  balance: number;
  hasBank: boolean;
  bankId: string | null;
  bankName: string;
  iban: string;
  isVerified: boolean;
  hasPending: boolean;
  hasBots: boolean;
  totalDailyIncome: number;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  time: string;
  text?: string;
  type: 'welcome' | 'text' | 'confirm_withdraw' | 'amount_selector' | 'no_bank' | 'no_bots' | 'history_list';
  payload?: any;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export default function wallet() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [info, setInfo] = useState<WithdrawInfo>({
    balance: 0,
    hasBank: false,
    bankId: null,
    bankName: '',
    iban: '',
    isVerified: false,
    hasPending: false,
    hasBots: false,
    totalDailyIncome: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [lastBotResponse, setLastBotResponse] = useState<string | null>(null);
  const [showQuickHints, setShowQuickHints] = useState(false);

  const quickReplies = [
    { shortcut: '/retirar', text: 'Solicitar levantamento para conta bancária' },
    { shortcut: '/saldo', text: 'Consultar saldo disponível para retirada' },
    { shortcut: '/banco', text: 'Ver dados bancários e IBAN cadastrado' },
    { shortcut: '/taxa', text: 'Ver taxas e limites de saque (10%)' },
    { shortcut: '/historico', text: 'Histórico de retiradas e levantamentos' },
    { shortcut: '/ajuda', text: 'Horários e instruções da Wallet' },
  ];

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {}
    }
  }, [messages]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_withdraw_info_mcpn');
      let loaded: WithdrawInfo = {
        balance: 0,
        hasBank: false,
        bankId: null,
        bankName: '',
        iban: '',
        isVerified: false,
        hasPending: false,
        hasBots: false,
        totalDailyIncome: 0,
      };

      if (!error && data && data.length > 0) {
        const d = data[0] as any;
        loaded.balance     = Number(d.balance) || 0;
        loaded.hasBank     = Boolean(d.has_bank);
        loaded.bankId      = d.bank_id || null;
        loaded.bankName    = d.bank_name || '';
        loaded.iban        = d.iban || '';
        loaded.isVerified  = Boolean(d.is_verified);
        loaded.hasPending  = Boolean(d.has_pending);
        // Lidos diretamente da RPC atualizada (inclui verificação de data_fim > now())
        loaded.hasBots          = Boolean(d.has_bots);
        loaded.totalDailyIncome = Number(d.total_daily_income) || 0;
      }

      // Fallback: se RPC ainda não devolveu has_bots (versão antiga), consulta separada
      if (!loaded.hasBots) {
        try {
          const { data: myBots } = await supabase.rpc('get_my_purchased_products_mcpn');
          if (myBots && Array.isArray(myBots)) {
            const activeBots = myBots.filter(
              (b: any) => Boolean(b.ativo) && (!b.data_fim || new Date(b.data_fim) > new Date())
            );
            loaded.hasBots          = activeBots.length > 0;
            loaded.totalDailyIncome = activeBots.reduce(
              (acc: number, b: any) => acc + (Number(b.renda_diaria) || 0),
              0
            );
          }
        } catch (_) {
          // silencioso — fallback não crítico
        }
      }

      // Fallback de banco: se get_withdraw_info não devolveu conta
      if (!loaded.hasBank) {
        try {
          const { data: bankAccounts } = await supabase.rpc('get_my_bank_accounts_mcpn');
          if (bankAccounts && bankAccounts.length > 0) {
            const first = bankAccounts[0];
            loaded.hasBank  = true;
            loaded.bankId   = first.id || null;
            loaded.bankName = first.bank_name || '';
            loaded.iban     = first.iban || '';
          }
        } catch (_) {}
      }

      setInfo(loaded);
      return loaded;
    } catch (err) {
      console.error('Erro ao carregar dados de retirada:', err);
      return null;
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
      } catch (e) {}

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: 'welcome-init',
            sender: 'bot',
            time: nowTime(),
            type: 'welcome',
          },
        ]);
      }, 80);
    }

    initChat();
  }, [fetchData]);

  const botReply = useCallback((builder: () => ChatMessage, delay = 180) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
  }, []);

  const processWithdrawal = useCallback(
    async (amount: number) => {
      if (!info.bankId) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'no_bank',
          text: 'Opa! Antes de prosseguir, você só precisa cadastrar sua conta bancária primeiro 🏦 É super rápido!',
        }));
        return;
      }

      setIsProcessing(true);
      setIsTyping(true);

      try {
        const { data, error } = (await supabase.rpc('process_withdrawal_request', {
          p_amount: amount,
          p_bank_id: info.bankId,
          p_password: '',
        })) as { data: { success: boolean; message: string } | null; error: any };

        if (error) throw error;
        setIsTyping(false);

        if (data?.success) {
          const fee = Math.round((amount * FEE_PERCENT) / 100);
          const net = amount - fee;
          showToast('Retirada enviada com sucesso!', 'success');

          setInfo((prev) => ({
            ...prev,
            balance: Math.max(0, prev.balance - amount),
            hasPending: true,
          }));

          setMessages((prev) => [
            ...prev,
            {
              id: 'success-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text:
                'Pedido de retirada enviado com sucesso! 🎉\n' +
                'Valor solicitado: ' + formatCurrency(amount, 'KZ') + ' (Líquido: ' + formatCurrency(net, 'KZ') + ', Taxa: ' + formatCurrency(fee, 'KZ') + ').\n' +
                'Destino: ' + info.bankName + ' (IBAN: ' + info.iban + ').\n' +
                'O pagamento será creditado em até 24 horas úteis.',
            },
          ]);
          setPendingAmount(null);
        } else {
          const msg = data?.message || 'Não foi possível concluir a solicitação.';
          showToast(msg, 'error');
          setMessages((prev) => [
            ...prev,
            {
              id: 'err-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: 'Ops! ' + msg + '\n\nQuando quiser tentar novamente, é só me enviar /retirar 😊',
            },
          ]);
          setPendingAmount(null);
        }
      } catch (err: any) {
        setIsTyping(false);
        const msg = err.message || 'Tivemos uma oscilação na conexão.';
        showToast(msg, 'error');
        setMessages((prev) => [
          ...prev,
          {
            id: 'err-catch-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Ops! Ocorreu um pequeno erro: ' + msg + '\n\nPor favor, tente novamente em instantes 😊',
          },
        ]);
        setPendingAmount(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [info, botReply, showToast]
  );

  const fetchRecentHistory = useCallback(async () => {
    try {
      // 1. Tenta buscar via RPC oficial de retiradas do usuário
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_withdrawals_mcpn');
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.slice(0, 10);
      }

      // 2. Busca pelo user_id autenticado diretamente na tabela retiradas_mcpn
      const { data: userAuth } = await supabase.auth.getUser();
      if (userAuth?.user?.id) {
        const { data: tableData } = await supabase
          .from('retiradas_mcpn')
          .select('*')
          .eq('user_id', userAuth.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (Array.isArray(tableData) && tableData.length > 0) {
          return tableData;
        }
      }

      // 3. Fallback via histórico geral filtrando apenas 'retiradas'
      const { data: genData } = await supabase.rpc('get_general_history_mcpn');
      if (Array.isArray(genData)) {
        const filtered = genData.filter((item: any) => item.type === 'retiradas');
        if (filtered.length > 0) {
          return filtered.slice(0, 10);
        }
      }

      return [];
    } catch {
      return [];
    }
  }, []);

  const formatHistoryAsText = useCallback((list: any[]) => {
    if (!list || list.length === 0) {
      return 'Histórico de Retiradas:\nNenhum saque registado ainda na sua conta. Para realizar uma retirada, envie /retirar.';
    }

    const itemsText = list.map((item: any, idx: number) => {
      const amount = Number(item.valor_bruto) || Number(item.amount) || Number(item.valor) || 0;
      const rawStatus = (item.status || 'pendente').toLowerCase();
      let statusEmoji = '⏳';
      let statusLabel = 'Pendente';
      if (rawStatus === 'concluido' || rawStatus === 'aprovado' || rawStatus === 'approved') {
        statusEmoji = '🟢';
        statusLabel = 'Aprovado';
      } else if (rawStatus === 'rejeitado' || rawStatus === 'cancelado' || rawStatus === 'recusado' || rawStatus === 'failed') {
        statusEmoji = '🔴';
        statusLabel = 'Recusado';
      }

      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleString('pt-AO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recente';

      const bankStr = item.banco_destino || item.bank_name || info.bankName || 'Conta Bancária';
      const ibanStr = item.iban_snapshot || item.iban || (info.iban ? `...${info.iban.slice(-4)}` : '');

      return `${idx + 1}. ${formatCurrency(amount, 'KZ')} | ${statusEmoji} ${statusLabel} | ${dateStr} | ${bankStr}${ibanStr ? ` (${ibanStr})` : ''}`;
    }).join('\n');

    return `Histórico de Retiradas (${list.length} registos):\n\n${itemsText}\n\nPara solicitar um novo saque, envie /retirar.`;
  }, [info.bankName, info.iban]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const content = (textToSend || inputText).trim();
      if (!content) return;

      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: content,
        type: 'text',
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText('');

      const withCmds = (text: string) =>
        text +
        '\n\n─────────────────\n' +
        '/retirar  •  /saldo  •  /historico\n/banco  •  /taxa  •  /horario  •  /ajuda';

      // Interpretação inteligente em linguagem natural e comandos
      const parsed = parseNaturalLanguage(content);

      // FLUXO DE CONFIRMAÇÃO PENDENTE DE SAQUE
      if (pendingAmount !== null) {
        if (parsed.intent === 'confirm') {
          processWithdrawal(pendingAmount);
          return;
        }
        if (parsed.intent === 'cancel') {
          setPendingAmount(null);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Solicitação de retirada cancelada. Quando quiser realizar um saque, envie /retirar.',
          }));
          return;
        }

        // Usuário digitou um novo valor enquanto havia pedido pendente
        if (parsed.intent === 'withdraw' && parsed.amount) {
          const newAmt = parsed.amount;
          const fresh = await fetchData();
          const curBal = fresh?.balance ?? info.balance;

          if (newAmt > curBal) {
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: `Saldo insuficiente. Seu saldo disponível é de ${formatCurrency(curBal, 'KZ')}.`,
            }));
            return;
          }
          if (newAmt < MIN_WITHDRAW) {
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: `O valor mínimo para saque é de ${formatCurrency(MIN_WITHDRAW, 'KZ')}.`,
            }));
            return;
          }
          if (newAmt > MAX_WITHDRAW) {
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: `O limite máximo por retirada é de ${formatCurrency(MAX_WITHDRAW, 'KZ')}.`,
            }));
            return;
          }

          setPendingAmount(newAmt);
          const fee = Math.round((newAmt * FEE_PERCENT) / 100);
          const net = newAmt - fee;
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'confirm_withdraw',
            payload: { amount: newAmt, fee, net, bankName: info.bankName, iban: info.iban },
          }));
          return;
        }
      }

      // 1. INTENT: SAUDAÇÃO CONVERSACIONAL (resposta humana e natural)
      if (parsed.intent === 'greeting') {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: 'Olá! Como posso ajudar você hoje? Pode perguntar seu saldo, pedir um saque ou consultar seu histórico.',
        }));
        return;
      }

      // 2. INTENT: AJUDA / START / BOAS-VINDAS
      if (parsed.intent === 'help') {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'welcome',
        }));
        return;
      }

      // 3. INTENT: LIMPAR CHAT
      if (parsed.intent === 'clear') {
        try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch (e) {}
        setPendingAmount(null);
        setMessages([{ id: 'welcome-' + Date.now(), sender: 'bot', time: nowTime(), type: 'welcome' }]);
        showToast('Conversa reiniciada!', 'success');
        return;
      }

      // 4. INTENT: CANCELAR
      if (parsed.intent === 'cancel') {
        setPendingAmount(null);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: 'Tudo bem! Nenhuma operação pendente.',
        }));
        return;
      }

      // 5. INTENT: CONSULTA DE SALDO REAL EM TEMPO REAL (direto e sem extras)
      if (parsed.intent === 'balance') {
        setIsTyping(true);
        const freshData = await fetchData();
        setIsTyping(false);
        const bal = freshData?.balance ?? info.balance;
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: `Seu saldo é de ${formatCurrency(bal, 'KZ')}. Para fazer um saque, envie /retirar ou digite o valor (ex: sacar 500).`,
        }));
        return;
      }

      // 6. INTENT: HISTÓRICO REAL DE RETIRADA
      if (parsed.intent === 'history') {
        setIsTyping(true);
        const history = await fetchRecentHistory();
        setIsTyping(false);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: formatHistoryAsText(history),
        }));
        return;
      }

      // 7. INTENT: DADOS BANCÁRIOS / CONTA (direto)
      if (parsed.intent === 'bank') {
        if (!info.hasBank) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bank',
            text: 'Você ainda não possui uma conta bancária cadastrada. Cadastre seus dados para poder retirar:',
          }));
        } else {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `Seu banco cadastrado é ${info.bankName}, IBAN: ${info.iban}.`,
          }));
        }
        return;
      }

      // 8. INTENT: HORÁRIOS DE ATENDIMENTO (direto)
      if (parsed.intent === 'schedule') {
        const sched = getWithdrawScheduleStatus();
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: `Horário de retiradas: Segunda a Sexta, das 09:00 às 18:00. ${sched.isOpen ? 'Aberto agora.' : sched.text}`,
        }));
        return;
      }

      // 9. INTENT: TAXAS E REGRAS (direto)
      if (parsed.intent === 'fees') {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: `Taxa operacional: ${FEE_PERCENT}%. Valor mínimo: ${formatCurrency(MIN_WITHDRAW, 'KZ')}. Valor máximo: ${formatCurrency(MAX_WITHDRAW, 'KZ')}. Prazo: até 24h úteis.`,
        }));
        return;
      }

      // 10. INTENT: RETIRADA / SAQUE (COM OU SEM VALOR ESPECIFICADO)
      if (parsed.intent === 'withdraw') {
        setIsTyping(true);
        const fresh = await fetchData();
        setIsTyping(false);
        const currentBal  = fresh?.balance     ?? info.balance;
        const hasPending  = fresh?.hasPending  ?? info.hasPending;
        const hasBank     = fresh?.hasBank     ?? info.hasBank;
        const bankId      = fresh?.bankId      ?? info.bankId;
        const bankName    = fresh?.bankName    ?? info.bankName;
        const iban        = fresh?.iban        ?? info.iban;
        const hasBots     = fresh?.hasBots     ?? info.hasBots;

        // Validação 1: Pedido já em análise
        if (hasPending) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Você já possui um pedido de retirada em análise. Aguarde a aprovação.',
          }));
          return;
        }

        // Validação 2: Horário comercial
        if (!isWithdrawAllowed()) {
          const sched = getWithdrawScheduleStatus();
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `Retiradas indisponíveis no momento. ${sched.text}`,
          }));
          return;
        }

        // Validação 3: Conta bancária cadastrada
        if (!hasBank || !bankId) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bank',
            text: 'Cadastre primeiro sua conta bancária para solicitar retiradas:',
          }));
          return;
        }

        // Validação 4: Robô de rendimento ATIVO e não expirado
        if (!hasBots) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bots',
            text: 'Para liberar retiradas, você precisa ter pelo menos um robô ativo na plataforma.',
          }));
          return;
        }

        // Determinar o valor pretendido
        let targetAmount: number | null = null;
        if (parsed.isAll) {
          targetAmount = Math.floor(currentBal);
        } else if (parsed.amount) {
          targetAmount = parsed.amount;
        }

        // Se nenhum valor foi informado (ex: user enviou "/retirar" ou "quero sacar")
        if (targetAmount === null) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'amount_selector',
            text: `Seu saldo disponível é de ${formatCurrency(currentBal, 'KZ')}. Escolha um valor rápido abaixo ou digite quanto quer sacar (mínimo: ${formatCurrency(MIN_WITHDRAW, 'KZ')}, taxa: ${FEE_PERCENT}%):`,
          }));
          return;
        }

        // Validações rigorosas de valor antes de prosseguir
        if (targetAmount < MIN_WITHDRAW) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `O valor mínimo para saque é de ${formatCurrency(MIN_WITHDRAW, 'KZ')}.`,
          }));
          return;
        }

        if (targetAmount > MAX_WITHDRAW) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `O valor excede o limite máximo permitido de ${formatCurrency(MAX_WITHDRAW, 'KZ')}.`,
          }));
          return;
        }

        if (targetAmount > currentBal) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `Saldo insuficiente. Você solicitou ${formatCurrency(targetAmount, 'KZ')}, mas possui ${formatCurrency(currentBal, 'KZ')}.`,
          }));
          return;
        }

        // Valor válido! Preparar confirmação
        const fee = Math.round((targetAmount * FEE_PERCENT) / 100);
        const net = targetAmount - fee;
        setPendingAmount(targetAmount);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'confirm_withdraw',
          payload: {
            amount: targetAmount,
            fee,
            net,
            bankName: bankName || info.bankName,
            iban: iban || info.iban,
          },
        }));
        return;
      }

      // 11. MOTOR CONVERSACIONAL DE RETIRADA (sys_t1000_retirada via RPC backend fallback)
      setIsTyping(true);
      try {
        const { data: rawRpc, error: rpcErr } = await (supabase.rpc as any)(
          'classify_withdraw_message',
          {
            p_message: content,
            p_last_intent: lastIntent,
            p_last_response: lastBotResponse,
          }
        );

        setIsTyping(false);

        // O Supabase SDK pode retornar JSONB como objeto direto, ou aninhado numa chave
        let intentData: any = null;
        if (!rpcErr && rawRpc) {
          if (Array.isArray(rawRpc) && rawRpc.length > 0) {
            const first = rawRpc[0];
            intentData = first.classify_withdraw_message ?? first;
          } else if (typeof rawRpc === 'object') {
            // Pode vir direto como {category, response, action} ou aninhado
            intentData = (rawRpc as any).classify_withdraw_message ?? rawRpc;
          }
          if (!intentData?.response) intentData = null;
        }

        if (intentData) {
          const { category, response, action } = intentData;
          setLastIntent(category);
          setLastBotResponse(response);

          // Limpar qualquer asterisco ou cerquilha que possa vir do banco
          const cleanResp = (response || '').replace(/[*#]/g, '').trim();

          if (action === 'TRIGGER_AMOUNT_SELECTOR') {
            if (!info.hasBank) {
              botReply(() => ({
                id: 'bot-' + Date.now(),
                sender: 'bot',
                time: nowTime(),
                type: 'no_bank',
                text: cleanResp || 'Cadastre sua conta bancária para solicitar o saque:',
              }));
              return;
            }
            if (!info.hasBots) {
              botReply(() => ({
                id: 'bot-' + Date.now(),
                sender: 'bot',
                time: nowTime(),
                type: 'no_bots',
                text: cleanResp || 'Para liberar o saque, ative um robô de rendimento:',
              }));
              return;
            }
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'amount_selector',
              text: cleanResp || `Qual valor deseja retirar? (Mínimo: ${formatCurrency(MIN_WITHDRAW, 'KZ')}, taxa: ${FEE_PERCENT}%)`,
            }));
            return;
          }

          if (action === 'TRIGGER_HISTORY') {
            setIsTyping(true);
            const history = await fetchRecentHistory();
            setIsTyping(false);
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: formatHistoryAsText(history),
            }));
            return;
          }

          if (action === 'TRIGGER_BANK_CONFIG') {
            if (!info.hasBank) {
              botReply(() => ({
                id: 'bot-' + Date.now(),
                sender: 'bot',
                time: nowTime(),
                type: 'no_bank',
                text: cleanResp || 'Cadastre sua conta bancária:',
              }));
              return;
            }
          }

          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: cleanResp,
          }));
          return;
        }
      } catch (err) {
        setIsTyping(false);
      }

      // Resposta padrão conversacional quando não identificou
      botReply(() => ({
        id: 'bot-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'text',
        text: 'Não entendi com clareza. Você pode pedir seu saldo, solicitar um saque (ex: sacar 500) ou enviar /historico.',
      }));
    },
    [inputText, info, pendingAmount, processWithdrawal, botReply, showToast, fetchRecentHistory, formatHistoryAsText, fetchData, lastIntent, lastBotResponse]
  );

  const handleConfirmButton = useCallback(() => {
    if (pendingAmount == null) return;
    setMessages((prev) => [
      ...prev,
      {
        id: 'usr-confirm-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: 'Confirmar Retirada',
        type: 'text',
      },
    ]);
    processWithdrawal(pendingAmount);
  }, [pendingAmount, processWithdrawal]);

  const handleCancelButton = useCallback(() => {
    setPendingAmount(null);
    setMessages((prev) => [
      ...prev,
      {
        id: 'usr-cancel-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: 'Cancelar',
        type: 'text',
      },
    ]);
    botReply(() => ({
      id: 'bot-' + Date.now(),
      sender: 'bot',
      time: nowTime(),
      type: 'text',
      text: 'Sem problemas! Cancelei a operação. Quando quiser tentar novamente, é só me chamar com /retirar 😊',
    }));
  }, [botReply]);

  const renderBotText = (text: string) => {
    return text.split('\n').map((line, lIdx, arr) => {
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
                  onClick={() => handleSendMessage(part)}
                  className="text-[#00c853] font-semibold cursor-pointer hover:underline"
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
    });
  };

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none relative"
      style={{ 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif",
        backgroundColor: '#afc8af',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
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

        {/* Cápsula central — Wallet */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 max-w-[65%] cursor-pointer active:scale-[0.98] transition-transform pointer-events-auto">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
            <img src="/logo-tb.jpg" alt="Wallet" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-white rounded-full flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-[#3390ec] rounded-full flex items-center justify-center">
                <svg className="w-[7px] h-[7px] text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-bold text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
              Wallet
            </h1>
            <span
              onClick={(e) => { e.stopPropagation(); handleSendMessage('/saldo'); }}
              className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] font-normal leading-[1.15] mt-0.5 truncate"
            >
              {loading ? 'Carregando...' : `Saldo: ${formatCurrency(info.balance, 'KZ')}`}
            </span>
          </div>
        </div>

        {/* Botão Menu */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 cursor-pointer"
            aria-label="Ajuda e instruções da Wallet"
            title="Ajuda e instruções"
          >
            <MoreVertical className="w-[22px] h-[22px]" />
          </button>
          </div>
      </header>

      {showHelpModal && (
        <div
          className="fixed inset-0 z-[100] h-[100dvh] bg-[#e9eff4] dark:bg-[#0e1621] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-help-title"
        >
          <header className="shrink-0 flex items-center gap-3 px-3 py-2.5 bg-[#517da2] text-white">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/15 transition-colors"
              aria-label="Fechar instruções"
            >
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>
            <div className="min-w-0">
              <h2 id="wallet-help-title" className="text-[17px] font-semibold">
                Ajuda da Wallet
              </h2>
              <p className="text-[13px] text-white/75">
                Como consultar e pedir uma retirada
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="max-w-2xl mx-auto space-y-5 pb-8">
              <section className="overflow-hidden rounded-xl bg-white dark:bg-[#17212b] text-[#222] dark:text-[#e6e6e6]">
                <h3 className="px-4 pt-4 pb-2 text-[15px] font-semibold text-[#2481cc]">Como funciona</h3>
                <ol className="px-4 pb-2 text-[14px]">
                  <li className="flex gap-3 border-b border-[#edf0f2] dark:border-white/10 py-2.5">
                    <span className="text-[#2481cc] font-semibold">1</span>
                    <span>Escolha um exemplo ou escreva o comando na conversa.</span>
                  </li>
                  <li className="flex gap-3 border-b border-[#edf0f2] dark:border-white/10 py-2.5">
                    <span className="text-[#2481cc] font-semibold">2</span>
                    <span>Envie a mensagem. A Wallet consulta os dados da sua conta e responde no chat.</span>
                  </li>
                  <li className="flex gap-3 py-2.5">
                    <span className="text-[#2481cc] font-semibold">3</span>
                    <span>Para retirar, confira o resumo antes de confirmar. Envie <code className="text-[#2481cc]">/cancelar</code> para interromper.</span>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="px-1 mb-2 text-[14px] font-semibold uppercase tracking-wide text-[#52718a] dark:text-[#91a8bb]">Comandos e respostas</h3>
                <div className="overflow-hidden rounded-xl bg-white dark:bg-[#17212b]">
                  {[
                    {
                      command: '/saldo',
                      title: 'Consultar saldo',
                      response: 'Seu saldo é de [saldo atual da sua conta]. Para fazer um saque, envie /retirar ou digite o valor (ex: sacar 500).'
                    },
                    {
                      command: '/retirar',
                      title: 'Iniciar retirada',
                      response: 'A Wallet consulta os requisitos da conta e, se estiver tudo pronto, mostra o saldo disponível e pede que escolha ou escreva um valor. Horário, conta bancária, robô ativo e limites podem afetar o pedido.'
                    },
                    {
                      command: 'sacar 500',
                      title: 'Pedir um valor específico',
                      response: 'Se a retirada estiver disponível e cumprir os requisitos, verá um resumo com o valor, a taxa, o valor líquido e a conta bancária antes de confirmar.'
                    },
                    {
                      command: '/banco',
                      title: 'Ver conta bancária',
                      response: 'Se já houver uma conta cadastrada, a Wallet informa o banco e o IBAN. Caso contrário, orienta a cadastrar os dados bancários.'
                    },
                    {
                      command: '/historico',
                      title: 'Consultar histórico',
                      response: 'A Wallet apresenta os pedidos de retirada encontrados ou informa que ainda não há saques registados.'
                    },
                    {
                      command: '/horario',
                      title: 'Ver horário',
                      response: 'Horário de retiradas: Segunda a Sexta, das 09:00 às 18:00. O estado aberto/fechado é indicado conforme o horário atual.'
                    },
                    {
                      command: '/taxa',
                      title: 'Ver taxas e limites',
                      response: 'Taxa operacional: 10%. Valor mínimo: 100 KZ. Valor máximo: 100.000 KZ. Prazo: até 24h úteis.'
                    }
                  ].map(({ command, title, response }) => (
                    <article key={command} className="px-4 py-3.5 border-b last:border-b-0 border-[#edf0f2] dark:border-white/10 text-[#222] dark:text-[#e6e6e6]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-[14px] font-medium">{title}</h4>
                          <code className="inline-block mt-0.5 text-[14px] font-semibold text-[#2481cc]">{command}</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowHelpModal(false);
                            handleSendMessage(command);
                          }}
                          className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#2481cc] hover:bg-[#2481cc]/10 active:bg-[#2481cc]/15 transition-colors"
                        >
                          Usar
                        </button>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#707579] dark:text-[#aab7c4]">
                        <span className="font-medium text-[#52718a] dark:text-[#91a8bb]">Resposta: </span>{response}
                      </p>
                    </article>
                  ))}
                </div>
                <p className="mt-3 px-1 text-[12px] leading-relaxed text-[#707579] dark:text-[#91a0ae]">
                  Os valores, estado do horário, dados bancários e histórico dependem dos dados reais da sua conta. Os exemplos são ilustrativos; uma retirada só é concluída após a confirmação no chat.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── CORPO DO CHAT ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
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
                  className="bg-white rounded-[16px] rounded-tl-none px-[10px] pt-[8px] pb-[8px] text-gray-900 w-full relative select-text"
                  style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                >
                {/* APRESENTAÇÃO / BOAS-VINDAS */}
                {msg.type === 'welcome' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="mb-2">
                      Olá! Que bom ver você por aqui! 😊 Sou o <strong>WithdrawBot</strong> 💸, seu assistente inteligente e oficial de retiradas.
                    </p>
                    <p className="text-[13px] text-gray-600 mb-2">
                      💡 <em>Dica: você também pode digitar mensagens comuns como <strong>"qual meu saldo"</strong> ou <strong>"quero sacar 500"</strong>.</em>
                    </p>
                    <p className="text-[#707579] text-[13px] pt-1.5 border-t border-gray-100">
                      {isWithdrawAllowed()
                        ? '🟢 Retiradas abertas agora! Envie /retirar para começar 😊'
                        : '🔴 Retiradas fechadas agora. Atendimento de Seg a Sex, das 09:00 às 18:00.'}
                    </p>
                  </div>
                )}

                {/* TEXTO BOT PADRÃO COM FORMATAÇÃO */}
                {msg.type === 'text' && msg.text && (
                  <div className="text-[14px] text-black leading-relaxed font-normal">
                    {renderBotText(msg.text)}
                  </div>
                )}

                {/* RESUMO DE CONFIRMAÇÃO DE RETIRADA */}
                {msg.type === 'confirm_withdraw' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                      Perfeito! Dá uma conferida no seu resumo: 📋
                    </p>
                    <p className="text-[13.5px] text-gray-800">
                      • <strong>Valor a retirar:</strong> {formatCurrency(msg.payload.amount, 'KZ')}
                      <br />
                      • <strong>Taxa operacional (10%):</strong> -{formatCurrency(msg.payload.fee, 'KZ')}
                      <br />
                      • <strong>Você vai receber:</strong>{' '}
                      <span className="text-[#25ae60] font-bold">
                        {formatCurrency(msg.payload.net, 'KZ')}
                      </span> 💵
                      <br />
                      • <strong>Destino:</strong> {msg.payload.bankName}
                      <br />
                      • <strong>IBAN:</strong>{' '}
                      <code className="font-mono text-[12px] text-[#2481cc] bg-gray-50 px-1 rounded">
                        {msg.payload.iban}
                      </code>
                    </p>
                    <p className="mt-2 text-[13px] text-gray-600">
                      Está tudo certinho? É só clicar em <strong>Confirmar</strong> abaixo! 😊
                    </p>
                  </div>
                )}

                {/* SELETOR RÁPIDO DE VALORES */}
                {msg.type === 'amount_selector' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                    <div className="mt-3 flex flex-wrap gap-1.5 select-none">
                      {[500, 1000, 2000, 5000, 10000].map((val) => (
                        <button
                          key={val}
                          disabled={val > info.balance}
                          onClick={() => handleSendMessage(String(val))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[#2481cc] text-[13px] font-semibold hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {formatCurrency(val, 'KZ')}
                        </button>
                      ))}
                      {info.balance >= MIN_WITHDRAW && (
                        <button
                          onClick={() => handleSendMessage(String(Math.floor(info.balance)))}
                          className="px-2.5 py-1.5 rounded-lg bg-[#3390ec]/10 border border-[#3390ec]/30 text-[#2481cc] text-[13px] font-bold hover:bg-[#3390ec]/20 active:scale-95 transition-all cursor-pointer"
                        >
                          Saldo Total ({formatCurrency(Math.floor(info.balance), 'KZ')})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ALERTA: SEM BANCO VINCULADO */}
                {msg.type === 'no_bank' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                  </div>
                )}

                {/* ALERTA: SEM ROBÔS COMPRADOS */}
                {msg.type === 'no_bots' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                  </div>
                )}

                {/* HISTÓRICO REAL EM TEXTO NORMAL SEM SUBCARDS */}
                {msg.type === 'history_list' && msg.text && (
                  <div className="text-[14px] text-black leading-relaxed font-normal">
                    {renderBotText(msg.text)}
                  </div>
                )}

                <div className="flex justify-end mt-1 text-[11px] text-[#8a8a8a] font-normal select-none">
                  <span>{msg.time}</span>
                </div>
              </div>
            </div>
            </div>

              {/* INLINE KEYBOARD: CONFIRMAR RETIRADA */}
              {msg.type === 'confirm_withdraw' && pendingAmount !== null && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <div className="w-full flex items-center gap-1">
                    <button
                      onClick={handleConfirmButton}
                      disabled={isProcessing}
                      className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center gap-1 cursor-pointer"
                    >
                      {isProcessing ? '⏳ Proc...' : '✅ Confirmar'}
                    </button>
                    <button
                      onClick={handleCancelButton}
                      disabled={isProcessing}
                      className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center gap-1 cursor-pointer"
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* INLINE KEYBOARD: CADASTRAR BANCO */}
              {msg.type === 'no_bank' && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button
                    onClick={() => navigate('/bank?redirect=/carteira')}
                    className="w-full bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    ➕ Cadastrar Conta Bancária
                  </button>
                </div>
              )}

              {/* BOTÃO DE AÇÃO: COMPRAR ROBÔ */}
              {msg.type === 'no_bots' && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button
                    onClick={() => navigate('/botfather')}
                    className="w-full bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    🤖 Ir para o Catálogo de Robôs
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
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
              <span className="text-[11.5px] text-[#707579] ml-1">WithdrawBot está digitando...</span>
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
          <div className="w-full max-w-[650px] bg-white dark:bg-[#182533] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-semibold text-[#2481cc] uppercase">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Comandos Rápidos (Wallet Bot)
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

            {/* ⚡ Comandos Rápidos */}
            <button
              type="button"
              onClick={() => setShowQuickHints(!showQuickHints)}
              className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 mr-1 ${
                showQuickHints ? 'text-[#2481cc] bg-[#2481cc]/15' : 'text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc]'
              }`}
              title="Comandos Rápidos"
            >
              <Zap className="w-5 h-5" />
            </button>

            {/* Campo de texto */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                if (pendingAmount !== null && /^\d*$/.test(e.target.value)) {
                  setInputText(e.target.value);
                } else if (pendingAmount === null) {
                  setInputText(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                pendingAmount !== null
                  ? 'Novo valor ou Sim/Não...'
                  : 'Mensagem...'
              }
              className="flex-1 min-w-0 w-0 px-1 py-1 text-[14.5px] sm:text-[15px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#8e8e93] dark:placeholder:text-gray-400 font-normal leading-snug"
            />

          </div>

          {/* Botão circular azul Telegram */}
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
