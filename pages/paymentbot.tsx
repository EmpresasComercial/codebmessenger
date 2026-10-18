import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as QRCode from 'qrcode';
import {
  MoreVertical,
  Send,
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  Paperclip,
  Building2,
  Wallet,
  Clock,
  FileText,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import PdfDownloadCard, { formatFileSize } from '../components/PdfDownloadCard';
import ChatAttachmentPicker from '../components/ChatAttachmentPicker';
import ChatsList from './ChatsList';
import PhotoPreviewModal from '../components/PhotoPreviewModal';
import AutoTranslatedText from '../components/AutoTranslatedText';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { fetchPayParams, getPaymentAssistantResponse } from './paymentAssistantCore';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import VerifiedBadge from '../components/VerifiedBadge';
import { isVerifiedManagerPhone, VERIFIED_MANAGER_PHONE } from '../lib/verifiedManager';
import { recordChatActivity } from '../lib/chatActivity';
import { PAYMENT_BOT_AVATAR } from '../lib/utils';
import { clearLegacyPaymentBotStorage } from '../lib/legacyAssistantChatHistory';

const MIN_RECHARGE = 3000;
const MAX_RECHARGE = 500000;
const LEGACY_RECHARGE_BANK_KEY = 'deposit_bot_current_bank';
const RECHARGE_BANK_ID_KEY = 'deposit_bot_current_bank_id';
const DEMO_MULTICAIXA_NUMBER = '928809034';
const DEMO_MULTICAIXA_ENTITY = 'MCX';
const DEMO_MULTICAIXA_REFERENCE = 'DEMO';
const DEMO_USDT_ADDRESS = 'TrhjbvkjhbklDFgnh35kjhgihgu';
const VERIFIED_MANAGER_DISPLAY_PHONE =
  parsePhoneNumberFromString(VERIFIED_MANAGER_PHONE)?.formatInternational() || VERIFIED_MANAGER_PHONE;

const rechargeSession = {
  get: () => {
    try {
      const id = localStorage.getItem('deposit_bot_recharge_id');
      const amtStr = localStorage.getItem('deposit_bot_current_amount');
      const bankId = localStorage.getItem(RECHARGE_BANK_ID_KEY);
      localStorage.removeItem(LEGACY_RECHARGE_BANK_KEY);
      return {
        rechargeId: id || null,
        amount: amtStr ? Number(amtStr) : null,
        bankId: bankId || null,
      };
    } catch {
      return { rechargeId: null, amount: null, bankId: null };
    }
  },
  set: (id: string | null, amount: number | null, bank: CollectionBank | null) => {
    try {
      if (id) localStorage.setItem('deposit_bot_recharge_id', id);
      else localStorage.removeItem('deposit_bot_recharge_id');

      if (amount !== null) localStorage.setItem('deposit_bot_current_amount', String(amount));
      else localStorage.removeItem('deposit_bot_current_amount');

      if (bank) localStorage.setItem(RECHARGE_BANK_ID_KEY, bank.id);
      else localStorage.removeItem(RECHARGE_BANK_ID_KEY);
      localStorage.removeItem(LEGACY_RECHARGE_BANK_KEY);
    } catch (error) {
      logger.error('PaymentBot', 'Não foi possível atualizar a sessão local da recarga.', error);
    }
  },
  clear: () => {
    try {
      localStorage.removeItem('deposit_bot_recharge_id');
      localStorage.removeItem('deposit_bot_current_amount');
      localStorage.removeItem(RECHARGE_BANK_ID_KEY);
      localStorage.removeItem(LEGACY_RECHARGE_BANK_KEY);
    } catch (error) {
      logger.error('PaymentBot', 'Não foi possível limpar a sessão local da recarga.', error);
    }
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

function getRechargeCommandMessage(input: string): string {
  const command = input.trim().toLowerCase().replace(/^\//, '');
  const messages: Record<string, string> = {
    depositar: 'Por favor, quero iniciar uma recarga.',
    recarregar: 'Por favor, quero iniciar uma recarga.',
    saldo: 'Por favor, quero consultar o meu saldo.',
    bancos: 'Por favor, quero consultar os bancos disponíveis para depósito ou transferência.',
    banco: 'Por favor, quero consultar os bancos disponíveis para depósito ou transferência.',
    contas: 'Por favor, quero consultar os bancos disponíveis para depósito ou transferência.',
    historico: 'Por favor, quero consultar o histórico das minhas recargas.',
    registos: 'Por favor, quero consultar o histórico das minhas recargas.',
    limites: 'Por favor, quero saber os limites e a taxa de cada recarga.',
    taxa: 'Por favor, quero saber os limites e a taxa de cada recarga.',
    taxas: 'Por favor, quero saber os limites e a taxa de cada recarga.',
    horarios: 'Por favor, quero consultar o horário de funcionamento das recargas.',
    horario: 'Por favor, quero consultar o horário de funcionamento das recargas.',
    total_deposito: 'Por favor, quero consultar o relatório total dos meus depósitos.',
    total_depositos: 'Por favor, quero consultar o relatório total dos meus depósitos.',
    relatorio: 'Por favor, quero consultar o relatório total dos meus depósitos.',
    extrato: 'Por favor, quero consultar o relatório total dos meus depósitos.',
    ajuda: 'Por favor, quero consultar as opções de ajuda do bot de recarga.',
    help: 'Por favor, quero consultar as opções de ajuda do bot de recarga.',
    menu: 'Por favor, quero consultar as opções de ajuda do bot de recarga.',
  };

  return messages[command] || input;
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
    | 'demo_multicaixa'
    | 'demo_usdt'
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

function DemoPaymentQrCode({ value, errorText }: { value: string; errorText: string }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setQrDataUrl('');
    setHasError(false);

    QRCode.toDataURL(value, { width: 200, margin: 2, errorCorrectionLevel: 'M' })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch((error: unknown) => {
        logger.error('PaymentBot', 'Falha ao gerar QR de demonstração:', error);
        if (active) setHasError(true);
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (hasError) {
    return <p role="alert" className="text-xs text-red-600">{errorText}</p>;
  }
  if (!qrDataUrl) {
    return <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-gray-100 dark:bg-[#242f3d]" aria-hidden="true" />;
  }

  return <img src={qrDataUrl} alt="QR Code de demonstração USDT" className="h-[200px] w-[200px] rounded-lg bg-white p-2" />;
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

export default function PaymentBot() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, language, translateFullChats } = useLanguage();
  const { session } = useAuth();

  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalRecharges, setTotalRecharges] = useState<number>(0);
  const [collectionBanks, setCollectionBanks] = useState<CollectionBank[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sensitiveBankValues = useMemo(
    () => [
      ...collectionBanks.flatMap((bank) => [bank.nome_banco, bank.nome_proprietario, bank.iban]),
      ...messages.flatMap((message) => {
        const payload = message.payload || {};
        return [
          payload.holderName,
          payload.ownerName,
          payload.nome_proprietario,
          payload.bankName,
          payload.iban,
          ...(Array.isArray(payload.sensitiveValues) ? payload.sensitiveValues : []),
          ...(Array.isArray(payload.banks)
            ? payload.banks.flatMap((bank: CollectionBank) => [bank.nome_banco, bank.nome_proprietario, bank.iban])
            : []),
        ];
      }),
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    [collectionBanks, messages]
  );
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [copiedIban, setCopiedIban] = useState(false);

  const quickReplies = [
    { shortcut: '/limpar', text: t('recharge.clear_conversation'), shortLabel: t('suggestion.clear') },
    { shortcut: '/depositar', text: t('recharge.cmd_deposit'), shortLabel: t('suggestion.recharge') },
    { shortcut: '/saldo', text: t('recharge.cmd_balance'), shortLabel: t('suggestion.balance') },
    { shortcut: '/bancos', text: t('recharge.cmd_banks'), shortLabel: t('suggestion.banks') },
    { shortcut: '/historico', text: t('recharge.history_title'), shortLabel: t('suggestion.history') },
    { shortcut: '/limites', text: t('recharge.cmd_limits'), shortLabel: t('suggestion.fee') },
    { shortcut: '/horarios', text: t('recharge.cmd_schedule'), shortLabel: t('suggestion.hours') },
    { shortcut: '/total_deposito', text: t('recharge.cmd_total'), shortLabel: t('suggestion.report') },
    { shortcut: '/ajuda', text: t('recharge.cmd_help'), shortLabel: t('suggestion.help') },
  ];
  const suggestedReplies = quickReplies.map(({ shortcut, shortLabel }) => ({
    shortcut,
    label: shortLabel,
  }));

  const [savedRechargeSession] = useState(() => rechargeSession.get());
  const [depositAmount, setDepositAmount] = useState<number | null>(savedRechargeSession.amount);
  const [selectedBank, setSelectedBank] = useState<CollectionBank | null>(null);
  const [activeRechargeId, setActiveRechargeId] = useState<string | null>(savedRechargeSession.rechargeId);
  const awaitingProof = Boolean(activeRechargeId && selectedBank && depositAmount !== null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasInitialized = useRef(false);

  const restartConversation = useCallback(() => {
    if (awaitingProof) {
      showToast('Envia o comprovativo ou cancela o pedido antes de reiniciar a conversa.', 'error');
      return;
    }
    clearLegacyPaymentBotStorage();
    rechargeSession.clear();
    setDepositAmount(null);
    setSelectedBank(null);
    setActiveRechargeId(null);
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

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  const fetchCollectionBanks = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_collection_banks_mcpn');
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('A consulta não devolveu uma lista válida de contas de depósito.');
    setCollectionBanks(data);
    return data as CollectionBank[];
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      void fetchPayParams();
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
          const { data: recData } = await supabase.from('paymentbot').select('valor, status');
          if (recData) {
            const sum = recData
              .filter((r: any) => r.status === 'aprovado' || r.status === 'concluido')
              .reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);
            setTotalRecharges(sum);
          }
        }
      } catch { }

      return await fetchCollectionBanks();
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchCollectionBanks]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initChat() {
      clearLegacyPaymentBotStorage();
      const banks = await fetchData();
      if (savedRechargeSession.bankId) {
        setSelectedBank(banks.find((bank: CollectionBank) => bank.id === savedRechargeSession.bankId) || null);
      }

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
  }, [fetchData, savedRechargeSession]);

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
        const banks = await fetchCollectionBanks();
        const currentBank = banks.find((item) => item.id === bank.id);
        if (!currentBank) {
          throw new Error('Esta conta de depósito já não está disponível. Consulte novamente a lista de bancos.');
        }
        let recId: string | null = null;

        try {
          const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('payment-recharge', {
            body: {
              action: 'create_recharge',
              amount,
              bank_id: currentBank.id,
              bank_name: currentBank.nome_banco,
            },
          });
          if (!edgeErr && edgeRes?.rechargeId) {
            recId = edgeRes.rechargeId;
          }
        } catch { }

        if (!recId) {
          const { data } = (await supabase.rpc('request_recharge_kz_mcpn', {
            p_amount: amount,
            p_bank_id: currentBank.id,
          })) as { data: any; error: any };

          recId = data?.recharge_id || data?.id || (data && typeof data === 'string' ? data : null);

          if (!recId) {
            const { data: userAuth } = await supabase.auth.getUser();
            if (userAuth?.user) {
              const { data: latest } = await supabase
                .from('paymentbot')
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
        rechargeSession.set(recId, amount, currentBank);

        setSelectedBank(currentBank);

        botReply(() =>
          createBotMsg('deposit_instructions', undefined, {
            amount,
            bank: currentBank,
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
    [botReply, fetchCollectionBanks, showToast]
  );

  const selectProofFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      showToast(t('recharge.proof_invalid_type'), 'error');
      return;
    }
    if (!awaitingProof || !(activeRechargeId || rechargeSession.get().rechargeId)) {
      showToast(t('recharge.proof_not_available'), 'error');
      return;
    }
    if (isUploading) return;

    if (isPdf) {
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
    }

    setSelectedProofFile(file);
  };

  const handleUploadProof = async (file: File, preparedDataUrl: string, caption: string): Promise<boolean> => {
    if (!file) return false;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      showToast(t('recharge.proof_invalid_type'), 'error');
      return false;
    }
    if (!awaitingProof || !(activeRechargeId || rechargeSession.get().rechargeId)) {
      showToast(t('recharge.proof_not_available'), 'error');
      return false;
    }
    if (isUploading) return false;

    let preparedImage: Blob | undefined;
    if (isImage) {
      try {
        preparedImage = await (await fetch(preparedDataUrl)).blob();
        if (!preparedImage.type.startsWith('image/')) throw new Error('A imagem preparada é inválida.');
      } catch (error) {
        logger.error('PaymentBot', 'Could not prepare the selected proof image:', error);
        showToast(t('recharge.proof_prepare_failed'), 'error');
        return false;
      }
    }

    const userImgMsgId = 'usr-proof-' + Date.now();
    const userImgMsg: ChatMessage = {
      id: userImgMsgId,
      sender: 'user',
      time: nowTime(),
      text: caption.trim() || (isPdf ? '' : 'Comprovativo de depósito anexado 📸'),
      imageUrl: isImage ? preparedDataUrl : undefined,
      ...(!isImage ? {
        attachment: {
          name: file.name,
          sizeBytes: file.size,
          mimeType: isPdf ? 'application/pdf' : (file.type || 'application/octet-stream')
        }
      } : {}),
      type: 'text',
    };
    recordChatActivity(session?.user.id, 'deposit-bot');
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

      const mimeType = isPdf ? 'application/pdf' : (preparedImage?.type || file.type || 'image/jpeg');
      const fileExt = isPdf
        ? 'pdf'
        : mimeType === 'image/jpeg'
          ? 'jpg'
          : (file.name.split('.').pop()?.toLowerCase() || 'img');

      const uploadPayload = isImage ? preparedImage! : file;
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

      const currentBanks = await fetchCollectionBanks();
      const bankId = selectedBank?.id || rechargeSession.get().bankId;
      const bankName = currentBanks.find((bank) => bank.id === bankId)?.nome_banco || 'Depósito Bancário';

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
      setSelectedProofFile(null);
      return true;
    } catch (err: any) {
      setIsTyping(false);
      showToast(err.message || 'Erro ao enviar comprovativo.', 'error');
      botReply(() =>
        createBotMsg(
          'text',
          'Erro ao enviar comprovativo: ' + (err.message || 'Falha de conexão.') + ' Tente anexar novamente ou envie /depositar.'
        )
      );
      return false;
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
          .from('paymentbot')
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
          .from('paymentbot')
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
        text: getRechargeCommandMessage(rawInput),
        type: 'text',
      };

      recordChatActivity(session?.user.id, 'deposit-bot');
      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) {
        setInputText('');
        if (inputRef.current) {
          inputRef.current.style.height = '24px';
          inputRef.current.style.overflowY = 'hidden';
        }
      }

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
        setIsTyping(true);
        try {
          const banks = await fetchCollectionBanks();
          const bankNames = [...new Set(banks.map((bank) => bank.nome_banco.trim()).filter(Boolean))];
          const banksText = bankNames.length > 0
            ? bankNames.map((name, index) => `${index + 1}. ${name}`).join('\n')
            : t('recharge.no_banks_available');
          setIsTyping(false);
          botReply(() => createBotMsg('text', `Bancos disponíveis para recarga:\n\n${banksText}\n\nPara iniciar um depósito, envie /depositar.`));
        } catch (error) {
          logger.error('PaymentBot', 'Não foi possível consultar as contas de depósito.', error);
          setIsTyping(false);
          botReply(() => createBotMsg('text', t('recharge.banks_query_failed')));
        }
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
          const items = recentList.map((item: any) => {
            const val = formatCurrency(Number(item.amount) || Number(item.valor) || 0, 'KZ');
            const { label: statusLabel } = formatStatus(item.status);
            const createdAt = item.created_at ? new Date(item.created_at) : null;
            const dateStr = createdAt && !Number.isNaN(createdAt.getTime())
              ? createdAt.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'data não disponível';
            const timeStr = createdAt && !Number.isNaN(createdAt.getTime())
              ? createdAt.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
              : '';
            const bankStr = item.banco_origem || item.bank_name || 'Transferência';
            const timePhrase = timeStr ? `, às ${timeStr}` : '';
            return `No dia ${dateStr}${timePhrase}, realizaste um depósito de ${val} pela via ${bankStr}, com estado ${statusLabel}.`;
          }).join('\n\n');
          const recordLabel = recentList.length === 1 ? 'depósito' : 'depósitos';
          histText = `Encontrei ${recentList.length} ${recordLabel} no teu histórico. Seguem os registos mais recentes:\n\n${items}\n\nPara fazer uma nova recarga, envie /depositar.`;
        } else {
          histText = 'Não encontrei depósitos registados na tua conta. Para fazer uma recarga, envie /depositar.';
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
        setIsTyping(true);
        try {
          const banks = await fetchCollectionBanks();
          setDepositAmount(nlp.amount);
          setIsTyping(false);
          botReply(() => createBotMsg('bank_selector',
            `Olá, por favor, selecione o método de pagamento para concluir a transferência de ${formatCurrency(nlp.amount!, 'KZ')}.`,
            { amount: nlp.amount, banks }
          ));
        } catch (error) {
          logger.error('PaymentBot', 'Não foi possível consultar as contas de depósito.', error);
          setIsTyping(false);
          botReply(() => createBotMsg('text', t('recharge.banks_query_failed')));
        }
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
        setIsTyping(true);
        try {
          const banks = await fetchCollectionBanks();
          setDepositAmount(numericVal);
          setIsTyping(false);
          botReply(() => createBotMsg('bank_selector',
            `Olá, por favor, selecione o método de pagamento para concluir a transferência de ${formatCurrency(numericVal, 'KZ')}.`,
            { amount: numericVal, banks }
          ));
        } catch (error) {
          logger.error('PaymentBot', 'Não foi possível consultar as contas de depósito.', error);
          setIsTyping(false);
          botReply(() => createBotMsg('text', t('recharge.banks_query_failed')));
        }
        return;
      }

      try {
        setIsTyping(true);
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
      fetchCollectionBanks,
      t,
      session?.user.id,
    ]
  );

  const renderBotText = useCallback(
    (text: string) => (
      <AutoTranslatedText
        text={text}
        language={language}
        enabled={translateFullChats && language !== 'pt'}
        sensitiveValues={sensitiveBankValues}
        renderFormatted={(localizedText) => (
          <BotFormattedText text={localizedText} onCommandClick={handleSendMessage} />
        )}
      />
    ),
    [handleSendMessage, language, sensitiveBankValues, translateFullChats]
  );

  return (
    <div
      className="relative flex h-[100dvh] w-full overflow-hidden select-none transition-colors !bg-none !bg-white dark:!bg-[#0e1621]"
      style={{ 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif",
        backgroundColor: '#afc8af',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      <aside className="hidden h-full w-[350px] shrink-0 border-r border-gray-200 dark:border-[#202b36] md:block">
        <ChatsList embedded />
      </aside>
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-40 flex h-[68px] w-full shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-3 sm:px-4 select-none pointer-events-none dark:border-[#27313d] dark:bg-[#17212b]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-8 shrink-0 items-center justify-center text-black pointer-events-auto dark:text-white md:hidden"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
        </button>

        <div className="mx-2 flex min-w-0 flex-1 items-center gap-3 pointer-events-auto">
          <div className="relative h-12 w-12 shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full">
              <img src={PAYMENT_BOT_AVATAR} alt="Payments Bot" className="h-full w-full object-cover" />
            </div>
            <span
              className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#10b981] dark:border-[#17212b]"
              title={t('chat.online_now')}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[16px] font-semibold text-black tracking-tight truncate leading-[1.15] mt-0.5">
                {VERIFIED_MANAGER_DISPLAY_PHONE}
              </h1>
              {isVerifiedManagerPhone(VERIFIED_MANAGER_PHONE) && <VerifiedBadge className="h-4 w-4 mt-0.5" />}
            </div>
            <span
              className={`mt-0.5 flex items-center gap-1 text-[14px] font-bold leading-[1.2] ${isTyping ? 'text-[#707579]' : 'text-[#25ae60]'}`}
              aria-live="polite"
            >
              {isTyping ? t('chat.typing') : t('chat.online_now')}
              {isTyping && (
                <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="relative pointer-events-auto">
          <button
            onClick={() => setShowMenuDropdown((prev) => !prev)}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-black dark:text-white"
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
        className="tg-theme-chat-canvas min-h-0 flex-1 overflow-y-auto bg-white px-2.5 pt-2 pb-40 space-y-4 relative select-text dark:bg-[#0e1621]"
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
                    className="bg-[#1877f2] text-white dark:bg-[#2b5278] rounded-[16px] rounded-br-none px-[10px] pt-[6px] pb-[6px] select-text relative"
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
                    style={{ top: 0, left: -8, fill: '#f5f5f5' }}
                  >
                    <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
                  </svg>
                  <div
                    className={`bg-[#f5f5f5] dark:bg-[#182533] text-gray-900 dark:text-gray-100 w-full relative select-text px-3.5 py-2.5 ${hasKeyboard ? 'rounded-tr-[16px] rounded-tl-none rounded-b-none' : 'rounded-[16px] rounded-tl-none'
                      }`}
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    {/* APRESENTAÇÃO INICIAL / BOAS-VINDAS */}
                    {msg.type === 'welcome' && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        <p>
                          <AutoTranslatedText
                            text={t('recharge.bot_welcome')}
                            language={language}
                            enabled={translateFullChats}
                            sensitiveValues={sensitiveBankValues}
                          />
                        </p>
                      </div>
                    )}

                    {/* TEXTO BOT PADRÃO */}
                    {msg.type === 'text' && msg.text && (
                      <div className="text-[14px] text-black leading-relaxed font-normal">
                        <AutoTranslatedText
                          text={msg.text}
                          language={language}
                          enabled={translateFullChats}
                          sensitiveValues={sensitiveBankValues}
                          renderFormatted={(translated) => renderBotText(translated)}
                        />
                      </div>
                    )}

                    {/* SELETOR DE VALORES RÁPIDOS */}
                    {msg.type === 'amount_selector' && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        {msg.text && (
                          <AutoTranslatedText
                            text={msg.text}
                            language={language}
                            enabled={translateFullChats}
                            sensitiveValues={sensitiveBankValues}
                            renderFormatted={(translated) => renderBotText(translated)}
                          />
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5 select-none">
                          {[3000, 5000, 10000, 20000, 50000, 100000].map((val) => (
                            <button
                              key={val}
                              onClick={() => handleSendMessage(String(val))}
                              className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[13px] font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95 cursor-pointer dark:border-[#33465a] dark:bg-[#242f3d] dark:text-gray-100 dark:hover:bg-[#2d3a49]"
                            >
                              {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SELETOR DE BANCOS DISPONÍVEIS */}
                    {msg.type === 'bank_selector' && msg.payload && (
                      <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                        {msg.text && (
                          <AutoTranslatedText
                            text={msg.text}
                            language={language}
                            enabled={translateFullChats}
                            sensitiveValues={sensitiveBankValues}
                            renderFormatted={(translated) => renderBotText(translated)}
                          />
                        )}
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
                            onClick={() => botReply(() => createBotMsg('demo_multicaixa', undefined, {
                              amount: msg.payload.amount,
                              paymentNumber: DEMO_MULTICAIXA_NUMBER,
                              entity: DEMO_MULTICAIXA_ENTITY,
                              reference: DEMO_MULTICAIXA_REFERENCE,
                            }))}
                            className="w-full text-left py-1.5 flex items-center justify-between text-[14px] text-gray-900 hover:text-[#2481cc] active:text-[#1f72b5] transition-colors cursor-pointer"
                          >
                            <span>{t('recharge.multicaixa_express')}</span>
                            <span className="text-[11px] font-medium text-[#25ae60] text-right">{t('recharge.demo_available')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => botReply(() => createBotMsg('demo_usdt', undefined, {
                              amount: msg.payload.amount,
                              address: DEMO_USDT_ADDRESS,
                              network: 'TRON (TRC20)',
                            }))}
                            className="w-full text-left py-1.5 flex items-center justify-between text-[14px] text-gray-900 hover:text-[#2481cc] active:text-[#1f72b5] transition-colors cursor-pointer"
                          >
                            <span>{t('recharge.usdt_wallet')}</span>
                            <span className="text-[11px] font-medium text-[#25ae60] text-right">{t('recharge.demo_available')}</span>
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

                    {msg.type === 'demo_multicaixa' && msg.payload && (
                      <div className="space-y-3 text-[13px] leading-relaxed text-gray-800 dark:text-gray-200">
                        <p className="font-bold text-[15px] text-[#2481cc]">{t('recharge.multicaixa_express')}</p>
                        <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                          {t('recharge.demo_warning')}
                        </p>
                        <div className="space-y-2">
                          <p>{t('recharge.payment_number')}: <strong className="font-mono text-[#2481cc]">{msg.payload.paymentNumber}</strong></p>
                          <p>{t('recharge.entity')}: <strong>{msg.payload.entity}</strong></p>
                          <p>{t('recharge.demo_reference')}: <strong>{msg.payload.reference}</strong></p>
                          <div className="flex items-center gap-2">
                            <p>{t('recharge.payment_amount')}: <strong className="text-[#dc2626]">{formatCurrency(msg.payload.amount, 'KZ')}</strong></p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(String(msg.payload.amount), true)}
                              className="text-[#2481cc] hover:text-[#1f72b5]"
                              title={t('common.copy')}
                              aria-label={`${t('common.copy')} ${formatCurrency(msg.payload.amount, 'KZ')}`}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.type === 'demo_usdt' && msg.payload && (
                      <div className="space-y-3 text-[13px] leading-relaxed text-gray-800 dark:text-gray-200">
                        <p className="font-bold text-[15px] text-[#2481cc]">{t('recharge.usdt_transfer_title')}</p>
                        <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                          {t('recharge.demo_warning')}
                        </p>
                        <p>{t('recharge.network')}: <strong>{msg.payload.network}</strong></p>
                        <div className="flex justify-center rounded-lg bg-white p-2">
                          <DemoPaymentQrCode
                            value={JSON.stringify({
                              demo: true,
                              network: msg.payload.network,
                              address: msg.payload.address,
                              amount: msg.payload.amount,
                              currency: 'KZ',
                            })}
                            errorText={t('recharge.qr_generation_failed')}
                          />
                        </div>
                        <p className="flex items-center gap-2">
                          <span>{t('recharge.payment_amount')}: <strong className="text-[#dc2626]">{formatCurrency(msg.payload.amount, 'KZ')}</strong></span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(msg.payload.amount), true)}
                            className="shrink-0 text-[#2481cc] hover:text-[#1f72b5]"
                            title={t('common.copy')}
                            aria-label={`${t('common.copy')} ${formatCurrency(msg.payload.amount, 'KZ')}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </p>
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 break-all">
                            {t('recharge.wallet_address')}: <strong className="font-mono text-[#2481cc]">{msg.payload.address}</strong>
                          </p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.payload.address)}
                            className="mt-0.5 shrink-0 text-[#2481cc] hover:text-[#1f72b5]"
                            title={t('common.copy')}
                            aria-label={`${t('common.copy')} ${t('recharge.wallet_address')}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
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
                                <span className="font-bold text-black text-[14px]">{b.nome_banco}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[13px] text-gray-600">{t('recharge.no_banks_available')}</p>
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
                        {msg.text && (
                          <AutoTranslatedText
                            text={msg.text}
                            language={language}
                            enabled={translateFullChats}
                            sensitiveValues={sensitiveBankValues}
                            renderFormatted={(translated) => renderBotText(translated)}
                          />
                        )}
                      </div>
                    )}

                    <div className="flex justify-end mt-1 text-[11px] text-[#8a8a8a] font-normal select-none">
                      <span>{msg.time}</span>
                    </div>
                  </div>

                  {msg.type === 'deposit_instructions' && msg.payload && (
                    <div className="w-full flex flex-col items-center justify-center gap-[2px] mt-[2px] select-none">
                      <button
                        onClick={() => setShowAttachmentPicker(true)}
                        disabled={isUploading}
                        className="bg-[#6b7b8a] bg-opacity-70 hover:bg-opacity-85 text-white px-4 py-2.5 text-[14px] font-medium active:scale-[0.99] transition-all disabled:opacity-50 w-full flex items-center justify-center gap-1.5 cursor-pointer rounded-none"
                      >
                        {isUploading ? '⏳' : `📷 ${t('recharge.proof_label')}`}
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

      {/* ── FOOTER FLUTUANTE IDÊNTICO AO OFFICIAL CHANNEL ── */}
      <footer className="absolute bottom-0 left-0 right-0 z-40 flex justify-center bg-white px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom,10px))] pointer-events-none dark:bg-[#17212b]">
        <div className="flex w-full max-w-[650px] flex-col gap-2 pointer-events-auto">
          {!awaitingProof && depositAmount === null && (
            <div className="w-full pb-4">
              {!messages.some((message) => message.sender === 'user') && (
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
              </div>
            </div>
          )}
          <div className="flex w-full items-center gap-2 pt-1">
            {/* Campo de composição */}
            <div className={`chat-composer-field flex min-h-[46px] min-w-0 flex-1 items-center ${inputText.length > 0 ? 'rounded-[12px]' : 'rounded-[22px]'} bg-[#f1f2f4] px-2.5 transition-[border-radius] duration-150 dark:bg-[#242f3d]`}>
              {/* Campo de texto */}
              <textarea
                ref={inputRef}
                value={inputText}
                rows={1}
                enterKeyHint="enter"
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  const maxHeight = 120;
                  e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
                  e.target.style.overflowY = e.target.scrollHeight > maxHeight ? 'auto' : 'hidden';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (window.matchMedia('(pointer: coarse)').matches) return;
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  awaitingProof
                    ? 'Envia o comprovativo ou escreve “cancelar pedido”...'
                    : depositAmount !== null && !selectedBank
                    ? 'Nome do banco...'
                    : t('chat.message_placeholder')
                }
                className="chat-composer-input max-h-[120px] min-h-[24px] min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent px-1 py-1 text-[16px] leading-snug font-normal text-black outline-none dark:text-white placeholder:text-[#7b7b7b] dark:placeholder:text-gray-400"
              />

              <button
                type="button"
                onClick={() => setShowAttachmentPicker(true)}
                disabled={isUploading}
                className="shrink-0 rounded-full p-1.5 text-[#1877f2] transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 cursor-pointer ml-1"
                title={t('recharge.proof_label')}
                aria-label={t('attachment.open')}
              >
                <Paperclip className="w-5 h-5 -rotate-45" />
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
      </div>

      {showAttachmentPicker && (
        <ChatAttachmentPicker
          translate={t}
          maxImageSizeBytes={10 * 1024 * 1024}
          onClose={() => setShowAttachmentPicker(false)}
          onSelectImage={selectProofFile}
          onSelectDocument={(file) => void selectProofFile(file)}
          onError={(message) => showToast(message, 'error')}
        />
      )}

      {selectedProofFile && (
        <PhotoPreviewModal
          key={`${selectedProofFile.name}:${selectedProofFile.size}:${selectedProofFile.lastModified}`}
          file={selectedProofFile}
          type={selectedProofFile.type === 'application/pdf' || selectedProofFile.name.toLowerCase().endsWith('.pdf')
            ? 'document'
            : 'image'}
          translate={t}
          disabled={isUploading}
          onReplace={selectProofFile}
          onCancel={() => setSelectedProofFile(null)}
          onSend={async (dataUrl, caption) => {
            await handleUploadProof(selectedProofFile, dataUrl, caption);
          }}
        />
      )}
    </div>
  );
}
