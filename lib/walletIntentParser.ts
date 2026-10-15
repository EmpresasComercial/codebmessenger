export type WalletIntent =
  | 'balance'
  | 'withdraw'
  | 'withdraw_info'
  | 'support'
  | 'history'
  | 'bank'
  | 'add_bank'
  | 'delete_bank'
  | 'schedule'
  | 'fees'
  | 'help'
  | 'clear'
  | 'cancel'
  | 'confirm'
  | 'greeting'
  | 'unknown';

export interface ParsedWalletMessage {
  intent: WalletIntent;
  amount?: number;
  isAll?: boolean;
}

const BANK_ADD_COMMANDS = [
  '/adicionar_banco', '/adicionar-banco', '/adicionar_conta', '/adicionar-conta',
  '/adicionar_iban', '/adicionar-iban', '/vincular_banco', '/vincular-banco',
  '/salvar_banco', '/salvar-banco', '/guardar_banco', '/guardar-banco',
];
const BANK_ADD_VERBS = ['adicionar', 'vincular', 'inserir', 'gravar', 'salvar', 'guardar', 'cadastrar'];
const BANK_ADD_TARGETS = ['banco', 'conta', 'iban', 'numero', 'número'];
const BANK_ADD_PHRASES = [
  'salvar numero', 'guardar numero', 'gravar numero',
  'adicionar conta bancaria', 'vincular conta',
];
const BANK_DELETE_COMMANDS = ['/deletar_conta', '/deletar-conta', '/remover_conta', '/remover-conta'];
const BANK_DELETE_VERBS = ['deletar', 'apagar', 'excluir', 'eliminar', 'remover'];
const BANK_DELETE_TARGETS = ['conta', 'banco', 'iban'];
const CONFIRMATIONS = [
  'sim', 'confirmar', 'confirma', 'confirmado', 'quero', 'yes', 's', 'ok',
  'prosseguir', 'avancar', 'pode ser', 'pode mandar', 'exato', 'com certeza', 'claro',
];
const CANCELLATIONS = [
  'cancelar', 'cancela', 'cancelado', 'nao', 'abortar', 'deixa', 'deixa pra la',
  'desistir', 'esquece', 'voltar', 'sair',
];
const CLEAR_COMMANDS = ['/limpar', '/reset', '/clear'];
const CLEAR_PHRASES = ['limpar', 'reset', 'clear', 'limpar chat', 'limpar conversa', 'apagar conversa', 'reiniciar'];
const WITHDRAWAL_TERMS = ['saque', 'saquei', 'retirada', 'retirei', 'levantamento', 'levantei'];
const WITHDRAWAL_PROBLEM_TERMS = [
  'nao caiu', 'nao recebi', 'nao chegou', 'ainda nao', 'nao entrou',
  'nao apareceu', 'nao foi creditado',
];
const WITHDRAWAL_CONCERNS = [
  'medo', 'preocupado', 'preocupada', 'ansioso', 'ansiosa', 'nervoso', 'nervosa', 'triste',
];
const WITHDRAWAL_INFO_PHRASES = [
  'como sacar', 'como retirar', 'como levantar', 'como fazer um saque',
  'como solicitar uma retirada', 'como funciona o saque', 'como posso realizar uma retirada',
  'como posso fazer uma retirada', 'posso realizar uma retirada', 'posso fazer um saque',
  'como posso sacar', 'como posso retirar',
];
const GREETINGS = [
  'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'feliz noite', 'opa', 'e ai',
  'tudo bem', 'tudo bom', 'como vai', 'como foi o dia', 'como foi teu dia',
  'como foi seu dia', 'fala', 'alo',
];
const ALL_BALANCE_PHRASES = [
  'sacar tudo', 'retirar tudo', 'saldo total', 'levantar tudo', 'todo o saldo', 'todo meu saldo',
];
const WITHDRAW_TRIGGERS = [
  'sacar', 'retirar', 'levantar', 'saque', 'retirada', 'quero', 'pedir',
  'tirar', 'fazer', 'manda', 'enviar',
];
const INTENT_PHRASE_RULES: Array<{ intent: WalletIntent; phrases: string[] }> = [
  {
    intent: 'balance',
    phrases: [
      'saldo', 'carteira', 'quanto tenho', 'quanto eu tenho', 'meu dinheiro',
      'dinheiro na conta', 'ver saldo', 'consultar saldo', 'mostrar saldo',
      'quanto sobrou', 'quanto posso', 'meu saldo', 'saldo disponivel', 'saldo atual',
    ],
  },
  {
    intent: 'history',
    phrases: [
      'historico', 'extrato', 'meus saques', 'minhas retiradas', 'ver historico',
      'ultimos saques', 'ultimas retiradas', 'registos', 'pedidos de retirada',
      'registro de retirada', 'saques anteriores', 'status do meu saque',
      'consultar historico', 'ver retiradas', 'meu saque caiu', 'onde esta meu saque',
    ],
  },
  {
    intent: 'bank',
    phrases: [
      'meu banco', 'minha conta', 'qual meu banco', 'qual meu iban', 'dados bancarios',
      'conta cadastrada', 'cadastrar banco', 'trocar banco', 'mudar banco', 'meu iban',
      'consultar banco',
    ],
  },
  {
    intent: 'schedule',
    phrases: [
      'horario', 'que horas', 'ta aberto', 'esta aberto', 'quando abre', 'quando fecha',
      'atendimento', 'funciona hoje', 'posso sacar agora', 'ta fechado', 'esta fechado',
    ],
  },
  {
    intent: 'fees',
    phrases: [
      'taxa', 'qual a taxa', 'quanto desconta', 'limite', 'regras', 'valor minimo',
      'valor maximo', 'qual o minimo', 'quanto posso sacar', 'minimo de saque',
    ],
  },
];
const HELP_PHRASES = [
  'ajuda', 'help', 'menu', 'inicio', 'start', 'como funciona',
  'o que voce faz', 'comandos', 'instrucoes',
];

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some(phrase => text.includes(phrase));
}

function hasAnyWord(text: string, words: string[]): boolean {
  return words.some(word => text.includes(word));
}

function matchesGreeting(text: string): boolean {
  return GREETINGS.includes(text)
    || GREETINGS.some(greeting => text.startsWith(`${greeting} `) || text.endsWith(` ${greeting}`));
}

function matchPhraseIntent(text: string): WalletIntent | undefined {
  if (['/banco', '/iban', '/conta'].includes(text)) return 'bank';
  return INTENT_PHRASE_RULES.find(rule => includesAny(text, rule.phrases))?.intent;
}

function parseWithdrawalAmount(text: string, cleanInput: string): number | undefined {
  const hasWithdrawWord = hasAnyWord(text, WITHDRAW_TRIGGERS)
    || text.startsWith('/retirar')
    || text.startsWith('/sacar');
  const numberMatch = text.match(
    /(?:(?:kz|ao|akz)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:kz|kwanza|reais|ao|akz))?/i
  );

  if (!numberMatch || (!hasWithdrawWord && !/^\d+$/.test(cleanInput.replace(/[\s.,]/g, '')))) {
    return undefined;
  }

  const amount = Math.floor(parseFloat(numberMatch[1].replace(/\./g, '').replace(',', '.')));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

export function parseNaturalLanguage(rawInput: string): ParsedWalletMessage {
  const clean = rawInput.trim();
  const norm = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const command = norm.split(/\s+/)[0];

  if (
    BANK_ADD_COMMANDS.includes(command)
    || (hasAnyWord(norm, BANK_ADD_VERBS) && hasAnyWord(norm, BANK_ADD_TARGETS))
    || includesAny(norm, BANK_ADD_PHRASES)
  ) {
    return { intent: 'add_bank' };
  }

  if (
    BANK_DELETE_COMMANDS.includes(command)
    || (hasAnyWord(norm, BANK_DELETE_VERBS) && hasAnyWord(norm, BANK_DELETE_TARGETS))
  ) {
    return { intent: 'delete_bank' };
  }

  if (norm === '/confirmar' || CONFIRMATIONS.includes(norm)) return { intent: 'confirm' };
  if (norm === '/cancelar' || CANCELLATIONS.includes(norm)) return { intent: 'cancel' };
  if (CLEAR_COMMANDS.includes(norm) || CLEAR_PHRASES.includes(norm)) return { intent: 'clear' };

  const reportsWithdrawalProblem =
    hasAnyWord(norm, WITHDRAWAL_TERMS) && includesAny(norm, WITHDRAWAL_PROBLEM_TERMS);
  const expressesWithdrawalConcern =
    hasAnyWord(norm, WITHDRAWAL_TERMS) && hasAnyWord(norm, WITHDRAWAL_CONCERNS);
  const reportsPossibleFraud = hasAnyWord(norm, ['burla', 'fraude', 'golpe', 'enganado', 'enganada', 'roubaram']);
  if (reportsWithdrawalProblem || expressesWithdrawalConcern || reportsPossibleFraud) {
    return { intent: 'support' };
  }

  if (includesAny(norm, WITHDRAWAL_INFO_PHRASES)) return { intent: 'withdraw_info' };
  if (matchesGreeting(norm)) return { intent: 'greeting' };

  const phraseIntent = matchPhraseIntent(norm);
  if (phraseIntent) return { intent: phraseIntent };

  if (includesAny(norm, ALL_BALANCE_PHRASES)) return { intent: 'withdraw', isAll: true };
  if (
    includesAny(norm, [
      'como sacar', 'como retirar', 'como levantar', 'como fazer um saque',
      'como solicitar uma retirada', 'como funciona o saque',
    ])
  ) {
    return { intent: 'withdraw_info' };
  }

  const amount = parseWithdrawalAmount(norm, clean);
  if (amount !== undefined) return { intent: 'withdraw', amount };

  if (hasAnyWord(norm, WITHDRAW_TRIGGERS) || norm.startsWith('/retirar') || norm.startsWith('/sacar')) {
    return { intent: 'withdraw' };
  }

  if (
    ['/ajuda', '/help', '/menu', '/start', '/inicio'].includes(norm)
    || HELP_PHRASES.includes(norm)
  ) {
    return { intent: 'help' };
  }

  return { intent: 'unknown' };
}
