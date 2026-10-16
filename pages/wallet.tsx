import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MoreVertical, 
  Send, 
  Loader2, 
  ChevronLeft,
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
  Zap,
  X
} from 'lucide-react';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { formatCurrency } from '../lib/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { parseNaturalLanguage } from '../lib/walletIntentParser';
import VerifiedBadge from '../components/VerifiedBadge';
import { isVerifiedManagerPhone, VERIFIED_MANAGER_PHONE } from '../lib/verifiedManager';
import AddBank from './AddBank';
import { fetchWalletParams } from './walletAssistantCore';
import { recordChatActivity } from '../lib/chatActivity';
import { WITHDRAWAL_BOT_AVATAR } from '../lib/utils';

const MIN_WITHDRAW = 3000;
const MAX_WITHDRAW = 500000;
const FEE_PERCENT = 14;
const NET_FACTOR = 0.86;
const VERIFIED_MANAGER_DISPLAY_PHONE =
  parsePhoneNumberFromString(VERIFIED_MANAGER_PHONE)?.formatInternational() || VERIFIED_MANAGER_PHONE;

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/saldo', '/carteira',
  '/retirar', '/sacar', '/retirada', '/saque',
  '/banco', '/iban', '/conta',
  '/adicionar_banco', '/adicionar-banco', '/adicionar_conta', '/adicionar-conta',
  '/adicionar_iban', '/adicionar-iban', '/vincular_banco', '/vincular-banco',
  '/salvar_banco', '/salvar-banco', '/guardar_banco', '/guardar-banco',
  '/deletar', '/deletar_conta', '/deletar-conta', '/remover_conta', '/remover-conta',
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

function getWalletCommandMessage(input: string): string {
  const normalized = input.trim().toLowerCase();
  const messages: Record<string, string> = {
    '/retirar': 'Quero solicitar o levantamento para a minha conta bancária.',
    '/sacar': 'Quero solicitar o levantamento para a minha conta bancária.',
    '/retirada': 'Quero solicitar o levantamento para a minha conta bancária.',
    '/saque': 'Quero solicitar o levantamento para a minha conta bancária.',
    '/saldo': 'Por favor, quero consultar o meu saldo disponível para retirada.',
    '/carteira': 'Por favor, quero consultar o meu saldo disponível para retirada.',
    '/banco': 'Consultar os meus dados bancários e o banco cadastrado.',
    '/iban': 'Consultar os meus dados bancários e o banco cadastrado.',
    '/conta': 'Consultar os meus dados bancários e o banco cadastrado.',
    '/taxa': 'Qual é a taxa cobrada em cada retirada?',
    '/taxas': 'Qual é a taxa cobrada em cada retirada?',
    '/horario': 'Qual é o horário para fazer retiradas?',
    '/horarios': 'Qual é o horário para fazer retiradas?',
    '/limites': 'Quais são os limites para fazer retiradas?',
    '/regras': 'Quais são as regras para fazer retiradas?',
    '/ajuda': 'Quais são os comandos disponíveis para consultar a carteira e fazer retiradas?',
    '/help': 'Quais são os comandos disponíveis para consultar a carteira e fazer retiradas?',
    '/menu': 'Quais são os comandos disponíveis para consultar a carteira e fazer retiradas?',
    '/historico': 'Por favor, dê-me o histórico de todas as retiradas.',
    '/registos': 'Por favor, dê-me o histórico de todas as retiradas.',
    '/extrato': 'Por favor, dê-me o histórico de todas as retiradas.',
    'consultar banco': 'Consultar os meus dados bancários e o banco cadastrado.',
    '/adicionar_banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/adicionar-banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/adicionar_conta': 'Por favor, desejo adicionar a minha conta bancária.',
    '/adicionar-conta': 'Por favor, desejo adicionar a minha conta bancária.',
    '/adicionar_iban': 'Por favor, desejo adicionar a minha conta bancária.',
    '/adicionar-iban': 'Por favor, desejo adicionar a minha conta bancária.',
    '/vincular_banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/vincular-banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/salvar_banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/salvar-banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/guardar_banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/guardar-banco': 'Por favor, desejo adicionar a minha conta bancária.',
    '/deletar': 'Quero remover a minha conta bancária cadastrada.',
    '/deletar_conta': 'Quero remover a minha conta bancária cadastrada.',
    '/deletar-conta': 'Quero remover a minha conta bancária cadastrada.',
    '/remover_conta': 'Quero remover a minha conta bancária cadastrada.',
    '/remover-conta': 'Quero remover a minha conta bancária cadastrada.'
  };

  return messages[normalized] || input.trim();
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
  type: 'welcome' | 'text' | 'bank_saved' | 'bank_details' | 'confirm_withdraw' | 'confirm_delete_bank' | 'amount_selector' | 'no_bank' | 'no_bots' | 'history_list';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [pendingBankDeletion, setPendingBankDeletion] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showQuickHints, setShowQuickHints] = useState(false);

  const quickReplies = [
    { command: '/adicionar_banco', label: t('wallet.cmd_add_bank') },
    { command: '/sacar', label: t('wallet.cmd_withdraw') },
    { command: '/saldo', label: t('wallet.cmd_balance') },
    { command: '/banco', label: t('wallet.cmd_bank_details') },
    { command: '/taxa', label: t('wallet.cmd_fees') },
    { command: '/horario', label: t('wallet.suggestion_hours') },
    { command: '/limites', label: t('wallet.suggestion_limits') },
    { command: '/historico', label: t('wallet.cmd_history') },
    { command: '/ajuda', label: t('common.help') },
    { command: '/deletar', label: t('wallet.cmd_delete_bank') },
  ];
  const suggestedReplies = quickReplies.map(({ command }) => ({
    command,
    label: command.replace(/^\/+/, ''),
  }));

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const hasProcessedEntryIntent = useRef(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  const fetchData = useCallback(async () => {
    try {
      void fetchWalletParams();
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
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (messages.length > 0) return;

    setIsTyping(true);
    const timeout = window.setTimeout(() => {
      setIsTyping(false);
      setMessages([{
        id: 'welcome-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'welcome',
      }]);
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [messages.length]);

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
      return `${t('withdraw.history_title')}:\n${t('withdraw.empty')} Para realizar uma retirada, envie /retirar.`;
    }

    const itemsText = list.map((item: any) => {
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

      const bankStr = item.banco_destino || item.bank_name || info.bankName || t('withdraw.bank_acc');
      const ibanStr = item.iban_snapshot || item.iban || (info.iban ? `...${info.iban.slice(-4)}` : '');

      return `No dia ${dateStr}, levantaste o montante de ${formatCurrency(amount, 'KZ')} pela conta ${bankStr}${ibanStr ? ` (${ibanStr})` : ''}, com o estado ${statusEmoji} ${statusLabel}.`;
    }).join('\n\n');

    return `${t('withdraw.history_title')} (${list.length} registos):\n\n${itemsText}\n\nPara solicitar um novo saque, envie /retirar.`;
  }, [info.bankName, info.iban, t]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const content = getWalletCommandMessage((textToSend || inputText).trim());
      if (!content) return;

      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: content,
        type: 'text',
      };

      recordChatActivity(session?.user.id, 'withdrawal-bot');
      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText('');

      // Interpretação inteligente em linguagem natural e comandos
      const parsed = parseNaturalLanguage(content);
      const previousAssistantMessage = messages
        .slice()
        .reverse()
        .find((message) => message.sender === 'bot' && message.type === 'text')?.text || '';

      if (parsed.intent === 'support') {
        setIsTyping(true);
        try {
          const { getWalletAssistantResponse } = await import('./walletAssistantCore');
          const response = getWalletAssistantResponse(content, previousAssistantMessage);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-support-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: response,
          }));
        } catch (error) {
          logger.error('wallet', 'Erro ao carregar respostas locais da Wallet:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-support-error-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Sinto muito pela preocupação. Consulta o /historico e contacta o gerente regional Mando pelo canal oficial se a retirada excedeu o prazo. Nunca partilhes palavras-passe ou códigos.',
          }));
        }
        return;
      }

      if (pendingBankDeletion) {
        if (parsed.intent === 'cancel') {
          setPendingBankDeletion(false);
          botReply(() => ({
            id: 'bot-bank-delete-cancel-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'A remoção da conta bancária foi cancelada.',
          }));
          return;
        }
        if (parsed.intent !== 'confirm') {
          botReply(() => ({
            id: 'bot-bank-delete-confirm-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Confirme a remoção da conta bancária com “Confirmar” ou cancele para manter os dados.',
          }));
          return;
        }

        setPendingBankDeletion(false);
        setIsTyping(true);
        try {
          const { data: accounts, error: accountsError } = await supabase.rpc('get_my_bank_accounts_mcpn');
          if (accountsError) throw accountsError;
          const bankAccount = accounts?.[0];
          if (!bankAccount) {
            setIsTyping(false);
            botReply(() => ({
              id: 'bot-bank-not-found-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: 'Não há uma conta bancária cadastrada para remover.',
            }));
            return;
          }

          const { data, error } = await supabase.rpc('remove_bank_account_mcpn', { p_id: bankAccount.id });
          if (error) throw error;
          const result = data && typeof data === 'object' && !Array.isArray(data)
            ? data as Record<string, unknown>
            : null;
          if (result?.success !== true) {
            throw new Error(typeof result?.message === 'string' ? result.message : 'Não foi possível remover a conta bancária.');
          }

          await fetchData();
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-bank-deleted-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'A conta bancária cadastrada foi removida com sucesso.',
          }));
        } catch (error) {
          console.error('Erro ao remover conta bancária:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-bank-delete-error-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: error instanceof Error ? error.message : 'Não foi possível remover a conta bancária. Tente novamente.',
          }));
        }
        return;
      }

      if (parsed.intent === 'delete_bank') {
        setIsTyping(true);
        try {
          const { data: accounts, error } = await supabase.rpc('get_my_bank_accounts_mcpn');
          if (error) throw error;
          setIsTyping(false);
          if (!Array.isArray(accounts) || accounts.length === 0) {
            botReply(() => ({
              id: 'bot-bank-no-delete-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: 'Não há uma conta bancária cadastrada para remover.',
            }));
            return;
          }
          setPendingBankDeletion(true);
          botReply(() => ({
            id: 'bot-bank-delete-confirmation-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'confirm_delete_bank',
            text: 'Tem certeza de que deseja remover a conta bancária cadastrada? Esta ação não pode ser desfeita.',
          }));
        } catch (error) {
          console.error('Erro ao verificar conta bancária para remoção:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-bank-delete-check-error-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Não foi possível verificar a conta bancária. Tente novamente dentro de instantes.',
          }));
        }
        return;
      }

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
        setIsTyping(true);
        try {
          const { getWalletAssistantResponse } = await import('./walletAssistantCore');
          const response = getWalletAssistantResponse(content, previousAssistantMessage);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: response,
          }));
        } catch (error) {
          logger.error('wallet', 'Erro ao carregar respostas locais da Wallet:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Olá! Sou Assistente Wallet. Como posso ajudar?',
          }));
        }
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

      // 5. INTENT: ADICIONAR CONTA BANCÁRIA
      if (parsed.intent === 'add_bank') {
        setIsTyping(true);
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
        try {
          const { data: accounts, error } = await supabase.rpc('get_my_bank_accounts_mcpn');
          if (error) throw error;
          setIsTyping(false);
          if (Array.isArray(accounts) && accounts.length > 0) {
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: 'Já existe uma conta bancária cadastrada. Não é possível adicionar outra conta.',
            }));
            return;
          }
          setShowAddBankModal(true);
        } catch (error) {
          console.error('Erro ao verificar conta bancária cadastrada:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Não foi possível verificar os seus dados bancários agora. Tente novamente dentro de instantes.',
          }));
        }
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
        setIsTyping(true);
        try {
          const { data: accounts, error } = await supabase.rpc('get_my_bank_accounts_mcpn');
          if (error) throw error;
          const account = Array.isArray(accounts) ? accounts[0] : null;
          setIsTyping(false);

          if (!account) {
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
              type: 'bank_details',
              payload: {
                intro: 'A sua conta cadastrada é, pelo nome de',
                holderName: account.owner_name,
                bankName: account.bank_name,
                iban: String(account.iban || '').replace(/^AO06/i, '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(),
              },
            }));
          }
        } catch (error) {
          console.error('Erro ao consultar dados bancários cadastrados:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-bank-query-error-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Não foi possível consultar os dados bancários agora. Tente novamente dentro de instantes.',
          }));
        }
        return;
      }

      // 8. INTENT: HORÁRIOS DE ATENDIMENTO (direto)
      if (parsed.intent === 'schedule') {
        const sched = getWithdrawScheduleStatus();
        setIsTyping(true);
        try {
          const { getWalletAssistantResponse } = await import('./walletAssistantCore');
          const response = getWalletAssistantResponse(content, previousAssistantMessage);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `${response} ${sched.isOpen ? 'Aberto agora.' : sched.text}`,
          }));
        } catch (error) {
          logger.error('wallet', 'Erro ao carregar respostas locais da Wallet:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: sched.isOpen ? 'O horário de retiradas é de segunda a sexta, das 09:00 às 18:00. Aberto agora.' : sched.text,
          }));
        }
        return;
      }

      // 9. INTENT: TAXAS E REGRAS (direto)
      if (parsed.intent === 'fees') {
        setIsTyping(true);
        try {
          const { getWalletAssistantResponse } = await import('./walletAssistantCore');
          const response = getWalletAssistantResponse(content);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `${response} O valor mínimo é ${formatCurrency(MIN_WITHDRAW, 'KZ')} e o máximo é ${formatCurrency(MAX_WITHDRAW, 'KZ')}.`,
          }));
        } catch (error) {
          logger.error('wallet', 'Erro ao carregar respostas locais da Wallet:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `A taxa operacional é ${FEE_PERCENT}%. O valor mínimo é ${formatCurrency(MIN_WITHDRAW, 'KZ')} e o máximo é ${formatCurrency(MAX_WITHDRAW, 'KZ')}.`,
          }));
        }
        return;
      }

      if (parsed.intent === 'withdraw_info') {
        setIsTyping(true);
        try {
          const { getWalletAssistantResponse } = await import('./walletAssistantCore');
          const response = getWalletAssistantResponse(content);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: response,
          }));
        } catch (error) {
          logger.error('wallet', 'Erro ao carregar respostas locais da Wallet:', error);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Para solicitar uma retirada, envie /retirar e siga as instruções da Wallet.',
          }));
        }
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
            text: t('withdraw.bank_required'),
          }));
          return;
        }

        // Validação 4: Bot de rendimento ativo e não expirado
        if (!hasBots) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bots',
            text: 'Para liberar retiradas, você precisa ter pelo menos um Bot ativo na plataforma.',
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

      // 11. Resposta conversacional local; o conteúdo do assistente não depende de RPC.
      setIsTyping(true);
      try {
        const { getWalletAssistantResponse } = await import('./walletAssistantCore');
        const response = getWalletAssistantResponse(content);
        setIsTyping(false);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: response,
        }));
      } catch (err) {
        console.error('Erro ao carregar respostas locais da Wallet:', err);
        setIsTyping(false);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: 'Não consegui preparar uma resposta agora. Tente novamente ou escolha uma das opções da Wallet.',
        }));
      }
    },
    [inputText, info, messages, pendingAmount, pendingBankDeletion, processWithdrawal, botReply, showToast, fetchRecentHistory, formatHistoryAsText, fetchData, session?.user.id, t]
  );

  useEffect(() => {
    if (searchParams.get('intent') !== 'add-bank' || hasProcessedEntryIntent.current) return;
    hasProcessedEntryIntent.current = true;
    setSearchParams({}, { replace: true });
    void handleSendMessage('/adicionar_banco');
  }, [searchParams, setSearchParams, handleSendMessage]);

  const handleConfirmButton = useCallback(() => {
    if (pendingAmount == null) return;
    recordChatActivity(session?.user.id, 'withdrawal-bot');
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
  }, [pendingAmount, processWithdrawal, session?.user.id]);

  const handleBankSaved = useCallback(async (account: { holderName: string; bankName: string; iban: string }) => {
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    setShowAddBankModal(false);
    setIsTyping(true);
    await fetchData();
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-bank-saved-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'bank_saved',
        payload: {
          intro: 'A sua conta bancária foi adicionada com sucesso, pelo nome de',
          holderName: account.holderName,
          bankName: account.bankName,
          iban: account.iban.replace(/^AO06/i, '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(),
        },
      },
    ]);
  }, [fetchData]);

  const handleBankAlreadyExists = useCallback(() => {
    setShowAddBankModal(false);
    botReply(() => ({
      id: 'bot-bank-exists-' + Date.now(),
      sender: 'bot',
      time: nowTime(),
      type: 'text',
      text: 'Já existe uma conta bancária cadastrada. Não é possível adicionar outra conta.',
    }));
  }, [botReply]);

  const handleCancelButton = useCallback(() => {
    setPendingAmount(null);
    recordChatActivity(session?.user.id, 'withdrawal-bot');
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
  }, [botReply, session?.user.id]);

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
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden !bg-none !bg-white select-none dark:!bg-[#0e1621]"
      style={{ 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif",
        backgroundColor: '#afc8af',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      {/* ── CABEÇALHO FLUTUANTE ── */}
      <header className="sticky top-0 z-40 flex h-[68px] w-full shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-3 select-none pointer-events-none dark:border-[#27313d] dark:bg-[#17212b]">

        {/* Botão Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-8 shrink-0 items-center justify-center text-black dark:text-white pointer-events-auto cursor-pointer"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
        </button>

        {/* Cápsula central — Wallet */}
        <div className="mx-2 flex min-w-0 flex-1 items-center gap-3 pointer-events-auto">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
            <img src={WITHDRAWAL_BOT_AVATAR} alt="Wallet" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[16px] font-semibold text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
                {VERIFIED_MANAGER_DISPLAY_PHONE}
              </h1>
              {isVerifiedManagerPhone(VERIFIED_MANAGER_PHONE) && <VerifiedBadge className="h-4 w-4 mt-0.5" />}
            </div>
            <span className="mt-0.5 flex items-center gap-1 text-[12px] font-normal leading-[1.15] text-[#25ae60]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#25ae60]" />
              Online
            </span>
          </div>
        </div>

        {/* Botão Menu */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-black dark:text-white cursor-pointer"
            aria-label={t('withdraw.guide_title')}
            title={t('withdraw.guide_title')}
          >
            <MoreVertical className="h-5 w-5" />
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
              aria-label={t('common.close')}
            >
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>
            <div className="min-w-0">
              <h2 id="wallet-help-title" className="text-[17px] font-semibold">
                {t('withdraw.guide_title')}
              </h2>
              <p className="text-[13px] text-white/75">
                {t('wallet.guide_subtitle')}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="max-w-2xl mx-auto space-y-5 pb-8">
              <section className="overflow-hidden rounded-xl bg-white dark:bg-[#17212b] text-[#222] dark:text-[#e6e6e6]">
                <h3 className="px-4 pt-4 pb-2 text-[15px] font-semibold text-[#2481cc]">{t('withdraw.info_title')}</h3>
                <ol className="px-4 pb-2 text-[14px]">
                  <li className="flex gap-3 border-b border-[#edf0f2] dark:border-white/10 py-2.5">
                    <span className="text-[#2481cc] font-semibold">1</span>
                    <span>{t('wallet.help_step1')}</span>
                  </li>
                  <li className="flex gap-3 border-b border-[#edf0f2] dark:border-white/10 py-2.5">
                    <span className="text-[#2481cc] font-semibold">2</span>
                    <span>{t('wallet.help_step2')}</span>
                  </li>
                  <li className="flex gap-3 py-2.5">
                    <span className="text-[#2481cc] font-semibold">3</span>
                    <span>{t('wallet.help_step3')} <code className="text-[#2481cc]">/cancelar</code> {t('wallet.cancel_command_info')}</span>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="px-1 mb-2 text-[14px] font-semibold uppercase tracking-wide text-[#52718a] dark:text-[#91a8bb]">{t('wallet.commands_and_replies')}</h3>
                <div className="overflow-hidden rounded-xl bg-white dark:bg-[#17212b]">
                  {[
                    {
                      command: '/adicionar_banco',
                      title: t('wallet.cmd_add_bank'),
                      response: t('wallet.guide_add_bank_response')
                    },
                    {
                      command: '/saldo',
                      title: t('wallet.cmd_balance'),
                      response: t('wallet.guide_balance_response')
                    },
                    {
                      command: '/retirar',
                      title: t('wallet.guide_item_withdraw'),
                      response: t('wallet.guide_withdraw_response')
                    },
                    {
                      command: 'sacar 500',
                      title: t('wallet.guide_item_amount'),
                      response: t('wallet.guide_amount_response')
                    },
                    {
                      command: 'consultar banco',
                      title: t('wallet.cmd_bank_details'),
                      response: t('wallet.guide_bank_response')
                    },
                    {
                      command: '/historico',
                      title: t('wallet.cmd_history'),
                      response: t('wallet.guide_history_response')
                    },
                    {
                      command: '/horario',
                      title: t('wallet.guide_item_hours'),
                      response: t('wallet.guide_hours_response')
                    },
                    {
                      command: '/taxa',
                      title: t('wallet.guide_item_fees'),
                      response: t('wallet.guide_fees_response')
                    },
                    {
                      command: '/deletar',
                      title: t('wallet.cmd_delete_bank'),
                      response: t('wallet.guide_delete_bank_response')
                    }
                  ].map(({ command, title, response }) => (
                    <article key={command} className="px-4 py-3.5 border-b last:border-b-0 border-[#edf0f2] dark:border-white/10 text-[#222] dark:text-[#e6e6e6]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-[14px] font-medium">{title}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowHelpModal(false);
                            handleSendMessage(command);
                          }}
                          className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#2481cc] hover:bg-[#2481cc]/10 active:bg-[#2481cc]/15 transition-colors"
                        >
                          {t('wallet.guide_use')}
                        </button>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#707579] dark:text-[#aab7c4]">
                        <span className="font-medium text-[#52718a] dark:text-[#91a8bb]">{t('wallet.response')}: </span>{response}
                      </p>
                    </article>
                  ))}
                </div>
                <p className="mt-3 px-1 text-[12px] leading-relaxed text-[#707579] dark:text-[#91a0ae]">
                  {t('wallet.guide_footer')}
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
        className="flex-1 overflow-y-auto bg-white px-2.5 pt-2 pb-40 space-y-3 relative select-text dark:bg-[#0e1621]"
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
                    className="bg-[#1877f2] text-white dark:bg-[#2b5278] rounded-[16px] rounded-br-none px-[10px] pt-[6px] pb-[6px] select-text relative"
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    <div className="relative leading-[1.3] pointer-events-none">
                      <span
                        className={`text-[16px] whitespace-pre-wrap break-words font-normal ${isValid ? 'text-white' : 'text-white'}`}
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {msg.text}
                      </span>
                      <span aria-hidden="true" className="inline-block h-[1px]" style={{ width: '56px' }} />
                      <div className="absolute bottom-[-1px] right-0 flex items-center gap-[2px] select-none text-[12px]">
                        <span className="font-normal leading-none text-white/80">{msg.time}</span>
                        <span className="text-white font-bold text-[11px] leading-none">✓✓</span>
                      </div>
                    </div>
                  </div>
                  <svg
                    width="9"
                    height="20"
                    viewBox="0 0 9 20"
                    className="absolute"
                    style={{ bottom: 0, right: -8, fill: '#1877f2' }}
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
                  style={{ top: 0, left: -8, fill: '#f5f5f5' }}
                >
                  <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
                </svg>
                <div
                  className="bg-[#f5f5f5] dark:bg-[#182533] rounded-[16px] rounded-tl-none px-[10px] pt-[8px] pb-[8px] text-gray-900 dark:text-gray-100 w-full relative select-text"
                  style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                >
                {/* APRESENTAÇÃO / BOAS-VINDAS */}
                {msg.type === 'welcome' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {t('wallet.welcome')}
                  </div>
                )}

                {/* TEXTO BOT PADRÃO COM FORMATAÇÃO */}
                {msg.type === 'text' && msg.text && (
                  <div className="text-[14px] text-black leading-relaxed font-normal">
                    {renderBotText(msg.text)}
                  </div>
                )}

                {(msg.type === 'bank_saved' || msg.type === 'bank_details') && msg.payload && (
                  <div className="text-[14px] leading-relaxed text-black">
                    {msg.payload.intro}{' '}
                    <strong className="font-semibold text-[#2481cc]">{msg.payload.holderName}</strong>, entidade bancária{' '}
                    <strong className="font-semibold text-[#2481cc]">{msg.payload.bankName}</strong>, número de referência{' '}
                    <strong className="font-semibold text-[#2481cc]">{msg.payload.iban}</strong>.
                  </div>
                )}

                {msg.type === 'confirm_delete_bank' && msg.text && (
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
                      • <strong>{t('withdraw.amount')}:</strong> {formatCurrency(msg.payload.amount, 'KZ')}
                      <br />
                      • <strong>{t('wallet.operational_fee')}:</strong> -{formatCurrency(msg.payload.fee, 'KZ')}
                      <br />
                      • <strong>{t('withdraw.net_amount')}:</strong>{' '}
                      <span className="text-[#25ae60] font-bold">
                        {formatCurrency(msg.payload.net, 'KZ')}
                      </span> 💵
                      <br />
                      • <strong>{t('withdraw.bank_acc')}:</strong> {msg.payload.bankName}
                      <br />
                      • <strong>{t('bank.iban')}:</strong>{' '}
                      <code className="font-mono text-[12px] text-[#2481cc] bg-gray-50 px-1 rounded">
                        {msg.payload.iban}
                      </code>
                    </p>
                    <p className="mt-2 text-[13px] text-gray-600">
                      Está tudo certinho? É só clicar em <strong>{t('common.confirm')}</strong> abaixo! 😊
                    </p>
                  </div>
                )}

                {/* SELETOR RÁPIDO DE VALORES */}
                {msg.type === 'amount_selector' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                    <div className="mt-3 flex flex-wrap gap-1.5 select-none">
                      {[3000, 5000, 10000, 25000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          disabled={val > info.balance}
                          onClick={() => handleSendMessage(String(val))}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[13px] font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:border-[#33465a] dark:bg-[#242f3d] dark:text-gray-100 dark:hover:bg-[#2d3a49]"
                        >
                          {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </button>
                      ))}
                      {info.balance >= MIN_WITHDRAW && (
                        <button
                          onClick={() => handleSendMessage(String(Math.floor(info.balance)))}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[13px] font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95 cursor-pointer dark:border-[#33465a] dark:bg-[#242f3d] dark:text-gray-100 dark:hover:bg-[#2d3a49]"
                        >
                          Saldo Total ({Math.floor(info.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
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

                {/* ALERTA: SEM BOTS ATIVOS */}
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
                      {isProcessing ? '⏳ Proc...' : `✅ ${t('common.confirm')}`}
                    </button>
                    <button
                      onClick={handleCancelButton}
                      disabled={isProcessing}
                      className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center gap-1 cursor-pointer"
                    >
                      ✕ {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {msg.type === 'confirm_delete_bank' && pendingBankDeletion && (
                <div className="w-full max-w-[80%] flex items-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('confirmar')}
                    className="flex-1 rounded-lg bg-[#d94848] px-2 py-2 text-[13px] font-medium text-white active:bg-[#c53d3d]"
                  >
                    {t('bank.remove')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('cancelar')}
                    className="flex-1 rounded-lg bg-[#6b7b8a] bg-opacity-70 px-2 py-2 text-[13px] font-medium text-white active:bg-opacity-90"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}

              {/* INLINE KEYBOARD: CADASTRAR BANCO */}
              {msg.type === 'no_bank' && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button
                    onClick={() => handleSendMessage('/adicionar_banco')}
                    className="w-full bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    ➕ {t('bank.bind')}
                  </button>
                </div>
              )}

              {/* BOTÃO DE AÇÃO: ATIVAR BOT */}
              {msg.type === 'no_bots' && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button
                    onClick={() => navigate('/botfather')}
                    className="w-full bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    🤖 Ir para o Catálogo de Bots
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
              <span className="text-[11.5px] text-[#707579] ml-1">{t('wallet.typing')}</span>
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
        <div className="fixed bottom-[135px] left-0 right-0 flex justify-center px-2 sm:px-6 z-40 animate-in slide-in-from-bottom-2">
          <div className="w-full max-w-[650px] bg-white dark:bg-[#182533] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-semibold text-[#2481cc] uppercase">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> {t('chat.quick_commands')} (Wallet Bot)
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
                key={qr.command}
                type="button"
                onClick={() => {
                  setShowQuickHints(false);
                  handleSendMessage(qr.command);
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-lg transition-colors text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER FLUTUANTE IDÊNTICO AO OFFICIAL CHANNEL ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-white px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom,10px))] pointer-events-none dark:bg-[#17212b]">
        <div className="flex w-full max-w-[650px] flex-col gap-2 pointer-events-auto">
          {pendingAmount === null && !pendingBankDeletion && (
            <div className="w-full border-b border-[#e5e5e5] pb-4 dark:border-[#27313d]">
              {!messages.some((message) => message.sender === 'user') && (
                <p className="mb-3 text-center text-[14px] font-normal leading-5 text-[#707579] dark:text-[#a3adb8]">
                  {t('chat.suggestion_prompt')}
                </p>
              )}
              <div className="flex w-full gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestedReplies.map((reply) => (
                  <button
                    key={reply.label}
                    type="button"
                    onClick={() => handleSendMessage(reply.command)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-[#eeeeee] bg-white px-3 py-1.5 text-[13px] font-normal leading-5 text-[#171717] shadow-[0_3px_6px_rgba(0,0,0,0.16)] transition-transform active:scale-95 dark:border-[#33465a] dark:bg-[#242f3d] dark:text-white"
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex w-full items-center gap-2 pt-1">
            {/* Campo de composição */}
            <div className="flex min-h-[46px] min-w-0 flex-1 items-center rounded-full bg-[#f1f2f4] px-2.5 dark:bg-[#242f3d]">
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
                    : t('chat.message_placeholder')
                }
                className="flex-1 min-w-0 w-0 px-1 py-1 text-[16px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#7b7b7b] dark:placeholder:text-gray-400 font-normal leading-snug"
              />
              <button
                type="button"
                onClick={() => handleSendMessage('/limpar')}
                className="shrink-0 rounded-full p-1.5 text-[#1877f2] transition-all active:bg-[#1877f2]/10"
                title="Reiniciar conversa"
                aria-label="Limpar e reiniciar conversa"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            {/* Botão circular azul Telegram */}
            <button
              onClick={() => handleSendMessage()}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-[#1877f2] transition-transform active:scale-90 cursor-pointer"
              aria-label={t('common.send')}
            >
              <Send className="h-[25px] w-[25px] fill-current stroke-[1.8]" />
            </button>
          </div>
        </div>
      </footer>

      {showAddBankModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3"
          onClick={() => setShowAddBankModal(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-add-bank-title"
            className="flex h-[80dvh] max-h-[760px] w-[92vw] max-w-[520px] flex-col overflow-hidden rounded-[8px] bg-[#f0eff5] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 px-4">
              <h2 id="wallet-add-bank-title" className="text-[16px] font-semibold text-[#111827]">
                {t('bank.add_new')}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#667085] hover:bg-black/5"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1">
              <AddBank
                embedded
                onSaved={handleBankSaved}
                onAlreadyExists={handleBankAlreadyExists}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
