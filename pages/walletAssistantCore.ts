import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { buildWithdrawalFeeExample } from './withdrawalFeeExample';

export interface WalletAssistantParams {
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  netFactor: number;
  formula: string;
  schedule: string;
  isBankingHoursNow: boolean;
  processingTime: string;
  userBalance?: number;
  hasPending?: boolean;
  hasBank?: boolean;
  bankName?: string | null;
  hasBots?: boolean;
  encryptedToken?: string;
}

const DEFAULT_WALLET_PARAMS: WalletAssistantParams = {
  minAmount: 3000,
  maxAmount: 500000,
  feePercent: 14,
  netFactor: 0.86,
  formula: 'valor_liquido = valor_bruto * 0.86',
  schedule: 'Segunda a Sexta-feira, das 09:00 às 18:00 (dias úteis)',
  isBankingHoursNow: true,
  processingTime: 'De instantes a poucas horas em horário bancário (máx. 24h úteis)',
  userBalance: 0,
  hasPending: false,
  hasBank: false,
  hasBots: false,
};

let cachedWalletParams: WalletAssistantParams = { ...DEFAULT_WALLET_PARAMS };

/**
 * Busca parâmetros dinâmicos oficiais e criptografados da RPC getwallet()
 */
export async function fetchWalletParams(): Promise<WalletAssistantParams> {
  try {
    const { data, error } = await supabase.rpc('getwallet');
    if (!error && data && typeof data === 'object') {
      const row = data as any;
      cachedWalletParams = {
        minAmount: Number(row.min_amount) || DEFAULT_WALLET_PARAMS.minAmount,
        maxAmount: Number(row.max_amount) || DEFAULT_WALLET_PARAMS.maxAmount,
        feePercent: Number(row.fee_percent) ?? DEFAULT_WALLET_PARAMS.feePercent,
        netFactor: Number(row.net_factor) || DEFAULT_WALLET_PARAMS.netFactor,
        formula: row.formula || DEFAULT_WALLET_PARAMS.formula,
        schedule: row.schedule || DEFAULT_WALLET_PARAMS.schedule,
        isBankingHoursNow: Boolean(row.is_banking_hours_now),
        processingTime: row.processing_time || DEFAULT_WALLET_PARAMS.processingTime,
        userBalance: Number(row.user_balance) || 0,
        hasPending: Boolean(row.has_pending),
        hasBank: Boolean(row.has_bank),
        bankName: row.bank_name || null,
        hasBots: Boolean(row.has_bots),
        encryptedToken: row.encrypted_token || undefined,
      };
    }
  } catch (err) {
    logger.warn('walletAssistantCore', 'Falha ao buscar getwallet do banco, usando cache local:', err);
  }
  return cachedWalletParams;
}

export function getWalletAssistantParams(): WalletAssistantParams {
  return cachedWalletParams;
}

function formatKZ(val: number): string {
  return `${val.toLocaleString('pt-AO')} KZ`;
}

function buildDynamicResponses(params: WalletAssistantParams) {
  const minFmt = formatKZ(params.minAmount);
  const maxFmt = formatKZ(params.maxAmount);
  const feeExample = buildWithdrawalFeeExample(params.feePercent, formatKZ).text;

  return {
    taxas: [
      `Em cada retirada realizada, a retenção operacional é de ${params.feePercent}% do valor retirado. ${feeExample}`,
      `A taxa de processamento é de ${params.feePercent}% sobre o valor da retirada. ${feeExample}`,
      `A retenção operacional corresponde a ${params.feePercent}% do valor solicitado. ${feeExample}`,
      `A taxa de serviço é de ${params.feePercent}% do valor retirado. ${feeExample}`,
      `Em cada retirada, é descontada uma taxa operacional de ${params.feePercent}%. ${feeExample}`,
    ],
    atraso: [
      'Confira no /historico se o saque aparece como Aprovado ou Pendente. Se passou do prazo de 24 horas úteis, contate o suporte com um print.',
      'Não se preocupe! Veja no /historico se ainda está em análise. Pode haver oscilação bancária de até 24h úteis.',
      'Envie /historico para ver a situação. Se estiver pendente fora do horário bancário, o processamento ocorre no próximo dia útil.',
      'Às vezes o banco receptor demora um pouco mais. Se passou de 24h úteis após a aprovação, entre em contato com o suporte oficial.',
      'Confira o /historico. O atraso pode ser do banco receptor; aguarde até 24h úteis e, se persistir, contacte o suporte.',
    ],
    prazos: [
      `O prazo é de ${params.processingTime}.`,
      `Saques dentro do horário bancário (${params.schedule}) geralmente caem no mesmo dia útil.`,
      'Assim que o financeiro aprova, a transferência bancária é emitida. Acompanhe pelo /historico!',
      'Normalmente, o processamento ocorre em até 24h úteis após a aprovação. Fins de semana e feriados não contam.',
      'O tempo varia de instantes a 24h úteis após a aprovação, dependendo do banco receptor.',
    ],
    limites: [
      `O limite mínimo por operação é de ${minFmt} e o máximo é de ${maxFmt}.`,
      `As retiradas vão de ${minFmt} a ${maxFmt} por transação. Para valores maiores, faça retiradas separadas.`,
      `Para saques: mínimo de ${minFmt} e máximo de ${maxFmt}. Envie /retirar para começar!`,
      `Pode sacar de ${minFmt} a ${maxFmt} por vez. O saldo precisa cobrir o valor desejado.`,
    ],
    fallback: [
      `Quero muito te ajudar! Pode perguntar sobre taxas (${params.feePercent}%), limites (${minFmt} a ${maxFmt}), prazos ou enviar /retirar para começar.`,
      'Não compreendi totalmente, mas estou aqui! Pergunte sobre prazos, taxas, limites, horários ou envie /retirar.',
      'Hmm, não entendi bem. Tente perguntar de outra forma! Posso ajudar com saldo, saque, taxas, prazos e horários.',
      'Pode reformular? Estou pronto para ajudar com saques, histórico, dados bancários e dúvidas gerais.',
      'Não captei bem sua mensagem. Tente /saldo, /retirar, /historico, /taxa ou /horario.',
    ],
    horarios: [
      `Nosso horário para processamento de saques é ${params.schedule}. ${params.isBankingHoursNow ? 'O expediente bancário está ativo agora!' : 'No momento estamos fora do horário bancário (solicitações entram na fila do próximo dia útil).' }`,
      `Saques funcionam em dias úteis: ${params.schedule}. Fins de semana sem processamento bancário.`,
      `O expediente financeiro opera ${params.schedule}. Dentro desse horário pode solicitar e o processamento é prioritário!`,
      `Atendemos ${params.schedule}. Sábados, domingos e feriados o sistema interbancário fica pausado.`,
      `Horário de funcionamento: ${params.schedule}. Fora disso, a liquidação ocorre no próximo dia útil.`,
    ],
    saudacao: [
      'Olá! Como posso te ajudar com o seu saque hoje?',
      'Oi! Seja bem-vindo(a). Precisa sacar, ver saldo ou tem dúvida? 😄',
      'Opa, fala comigo! Sou o Assistente Wallet. Em que posso te orientar?',
      'Oi! Tudo tranquilo? Me conta como posso ajudar com a sua retirada.',
      'Olá! Estou pronto para facilitar seus saques. O que precisa?',
      'Oi! Pode falar. Estou aqui para dúvidas sobre retiradas.',
      'Olá! Que bom ter você aqui. Como posso ajudar?',
      'Oi! Precisa sacar, verificar saldo ou tem alguma dúvida? É só falar!',
    ],
    seguranca: [
      'As operações financeiras devem ser realizadas apenas pelos fluxos oficiais da plataforma. Nunca partilhe a sua palavra-passe ou códigos de verificação.',
      'Proteja os seus dados bancários e confirme sempre os detalhes da retirada antes de a aprovar.',
    ],
    banco_iban: [
      'Para cadastrar ou conferir sua conta bancária e IBAN de recebimento, use o comando Consultar dados bancários ou Adicionar conta bancária. 💳',
      'O saque é enviado ao IBAN vinculado à sua conta. Use Consultar dados bancários para verificar os dados atuais. 🏦',
      'Precisa cadastrar a sua conta? Use Adicionar conta bancária. Para consultar os dados cadastrados, escolha Consultar dados bancários.',
    ],
    como_sacar: [
      `Para solicitar um saque, precisa ter uma conta bancária (IBAN) cadastrada e um Bot ativo. O valor mínimo é de ${minFmt} e a retenção operacional é de ${params.feePercent}% do valor retirado. Digite /retirar para iniciar! 💸`,
      `É fácil: tenha o banco cadastrado, solicite no horário de atendimento (${params.schedule}) e envie /retirar. 😊`,
      `Pode retirar o saldo disponível para a sua conta bancária (limites de ${minFmt} a ${maxFmt}). Envie /retirar para começar! 🚀`,
    ],
    cancelamento: [
      'Se o saque ainda estiver com status “Pendente”, consulte o suporte para saber se é possível cancelar. Envie /historico para conferir. 📋',
      'Saques já processados e transferidos não podem ser cancelados. Se ainda estiver pendente, contacte o suporte oficial para orientação. 💬',
    ],
    agradecimento: [
      'De nada! 😊 Se precisar de mais alguma coisa sobre seu saque, estou à disposição.',
      'Por nada! 😄 Sempre que tiver dúvidas sobre retiradas e prazos, pode me chamar.',
      'Disponha! 👍 Tenha um ótimo dia!',
      'Tranquilo! 😊 Qualquer dúvida sobre saques ou conta bancária, é só falar.',
    ],
    recusado_erro: [
      'Se o saque foi recusado, confira se o IBAN e os dados bancários estão corretos e se possui um Bot ativo. Consulte o /historico ou o suporte oficial. 😕',
      'O saque pode ser rejeitado se os dados bancários estiverem incorretos ou houver uma pendência de verificação. Use Consultar dados bancários para conferir o IBAN. 🏦',
      'Se um saque falhar, consulte o /historico para confirmar o estado e contacte o suporte antes de tentar novamente.',
    ],
    requisitos_bot: [
      'Para realizar retiradas na plataforma, é necessário possuir ao menos um Bot ativo gerando rendimentos. Acesse a área de produtos para ativar! 🤖✨',
      'A política de saques requer Bots ativos na conta. Se ainda não tem Bots, acesse o catálogo no menu principal. 🚀',
      'Para solicitar saques, a conta precisa cumprir os requisitos de verificação e ter Bots em operação. Confira os seus Bots ativos no painel principal! 💼',
    ],
    status_historico: [
      'Para acompanhar o andamento dos seus saques, consulte o histórico. Lá verá se a retirada está pendente, aprovada ou paga. 📋😊',
      'Pode consultar os pedidos de retirada pelo comando /historico. O estado é atualizado quando a equipa processa o pedido. 🔍',
      'Acesse o /historico para consultar o estado atual do seu saque e os detalhes da transferência bancária. 👍',
    ],
    fora_dominio_deposito: [
      'Aqui posso ajudar com saques e retiradas. Para fazer recargas ou depósitos, acesse a página de Depósito no menu principal.',
      'Sou o Assistente Wallet. Para adicionar saldo ou fazer um depósito, use a página de Recarga da plataforma.',
    ],
    frustracao: [
      'Lamento que esteja a passar por isso. Vou tentar ajudar. Pode contar-me o que aconteceu com a sua retirada?',
      'Compreendo a sua frustração. Vamos verificar juntos: consulte o /historico ou explique-me o que aconteceu.',
    ],
    burla: [
      'Percebo a sua preocupação. Não consigo confirmar apenas por esta conversa se uma situação é legítima ou uma burla. Use somente os canais oficiais da plataforma, confira o estado em /historico e não partilhe palavras-passe, códigos de verificação nem pague valores adicionais para “libertar” um saque. Se algo parecer suspeito, contacte o suporte oficial.',
      'Entendo a dúvida. Não posso garantir que uma mensagem ou pedido seja legítimo sem verificação. Confirme tudo pelos canais oficiais, não envie códigos ou palavras-passe e nunca pague uma taxa extra fora da plataforma. Se suspeitar de burla, fale com o suporte oficial.',
    ],
    retirada_atrasada: [
      'Sinto muito pelo transtorno; compreendo a preocupação. Vi que mencionaste {elapsed}. Consulta o /historico para confirmar se o pedido está pendente ou aprovado. Se já passaram mais de 24 horas úteis desde a aprovação, contacta o suporte oficial e envia a referência do pedido.',
      'Lamento que o valor ainda não tenha chegado. Como referiste {elapsed}, verifica primeiro o estado e a data de aprovação no /historico. Se excedeu 24 horas úteis após a aprovação, contacta o suporte oficial com a referência da retirada.',
    ],
    acolhimento: [
      'Lamento que estejas a sentir isso. Estou aqui para te ouvir e tentar ajudar. Queres contar-me o que aconteceu?',
      'Percebo que isso possa ser difícil. Vamos por partes: o que está a deixar-te assim?',
    ],
  };
}

type ResponseTopic = keyof ReturnType<typeof buildDynamicResponses>;

const topicPatterns: Array<[ResponseTopic, string[]]> = [
  ['fora_dominio_deposito', ['deposito', 'depositar', 'recarga', 'recarregar', 'adicionar saldo']],
  ['burla', ['burla', 'burlado', 'burlada', 'fraude', 'golpe', 'enganado', 'enganada', 'roubaram', 'roubo']],
  ['agradecimento', ['obrigado', 'obrigada', 'agradeco', 'valeu', 'disponha']],
  ['frustracao', ['frustrado', 'frustrada', 'insatisfeito', 'insatisfeita', 'irritado', 'irritada', 'indignado', 'indignada', 'nao funciona', 'nao resolve', 'que absurdo', 'estou zangado', 'estou chateado', 'estou triste', 'reclamacao']],
  ['acolhimento', ['estou com medo', 'tenho medo', 'estou preocupado', 'estou preocupada', 'estou ansioso', 'estou ansiosa', 'estou triste', 'estou nervoso', 'estou nervosa']],
  ['cancelamento', ['cancelar saque', 'cancelar retirada', 'cancelamento', 'desistir do saque']],
  ['recusado_erro', ['recusado', 'recusada', 'rejeitado', 'rejeitada', 'saque falhou', 'retirada falhou', 'erro no saque']],
  ['atraso', ['atraso', 'atrasado', 'atrasada', 'nao caiu', 'nao recebi', 'ainda nao recebi', 'demora', 'demorando']],
  ['prazos', ['prazo', 'quanto tempo', 'quando cai', 'quando recebo', 'demora para cair', 'tempo de processamento']],
  ['limites', ['limite', 'minimo', 'maximo', 'valor minimo', 'valor maximo', 'quanto posso sacar']],
  ['taxas', ['taxa', 'taxas', 'desconto', 'quanto desconta', 'comissao']],
  ['horarios', ['horario', 'horarios', 'que horas', 'quando abre', 'quando fecha', 'fim de semana', 'sabado', 'domingo']],
  ['seguranca', ['seguro', 'seguranca', 'protegido', 'protecao', 'confiavel', 'fraude', 'senha']],
  ['requisitos_bot', ['preciso de bot', 'precisa de bot', 'requisito para sacar', 'requisitos para sacar', 'bot ativo', 'plano ativo']],
  ['como_sacar', ['como sacar', 'como retiro', 'como retirar', 'como levantar', 'como faco para sacar', 'como fazer saque']],
  ['banco_iban', ['iban', 'banco', 'conta bancaria', 'dados bancarios', 'conta cadastrada']],
  ['status_historico', ['status', 'estado do saque', 'estado da retirada', 'acompanhar saque', 'acompanhar retirada']],
];

function normalizeMessage(message: string): string {
  return message
    .toLocaleLowerCase('pt')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectResponse(topic: ResponseTopic, normalizedMessage: string, responsesObj: ReturnType<typeof buildDynamicResponses>): string {
  const options = responsesObj[topic];
  let hash = 0;
  for (let index = 0; index < normalizedMessage.length; index += 1) {
    hash = (hash * 31 + normalizedMessage.charCodeAt(index)) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

function getElapsedTime(message: string): string {
  const normalized = normalizeMessage(message);
  const match = normalized.match(/(\d{1,3})\s*(horas?|hrs?|h|dias?|d)\b/);
  if (!match) return 'que já esperas há algum tempo';
  const unit = match[2].startsWith('d') ? (Number(match[1]) === 1 ? 'dia' : 'dias') : (Number(match[1]) === 1 ? 'hora' : 'horas');
  return `${match[1]} ${unit}`;
}

export function getWalletAssistantResponse(
  message: string,
  previousAssistantMessage = '',
  customParams?: Partial<WalletAssistantParams>
): string {
  const params: WalletAssistantParams = { ...cachedWalletParams, ...customParams };
  const responses = buildDynamicResponses(params);
  const normalized = normalizeMessage(message);
  const previous = normalizeMessage(previousAssistantMessage);

  const isPositiveWellbeingReply = /\b(tambem|igualmente)\b/.test(normalized) &&
    /\b(bem|otimo|otima|tranquilo|tranquila|tudo certo)\b/.test(normalized);
  const wasAskedAboutWellbeing = /\b(como estas|como esta|estas bem|esta bem|tudo bem|tudo bom|como vai)\b/.test(previous);
  if (isPositiveWellbeingReply && wasAskedAboutWellbeing) {
    return 'Ah, que bom saber que estás bem! Como posso ajudar hoje?';
  }
  const wasAskedAboutDay = /\b(como foi (o teu|teu|o seu|seu) dia)\b/.test(previous);
  if (wasAskedAboutDay && /\b(bem|bom|boa|otimo|otima|tranquilo|tranquila)\b/.test(normalized)) {
    return 'Que bom! Espero que corra tudo bem contigo. Como posso ajudar com a tua retirada?';
  }

  const mentionsWithdrawal = /\b(saque|saquei|retirada|retirei|levantamento|levantei|valor|dinheiro)\b/.test(normalized);
  const reportsNotReceived = /\b(nao caiu|nao recebi|nao chegou|ainda nao|nao entrou|nao apareceu|nao foi creditado)\b/.test(normalized);
  const expressesDistress = /\b(medo|assustado|assustada|preocupado|preocupada|ansioso|ansiosa|triste|nervoso|nervosa)\b/.test(normalized);
  if (mentionsWithdrawal && reportsNotReceived) {
    return selectResponse('retirada_atrasada', normalized, responses).replace('{elapsed}', getElapsedTime(message));
  }
  if (mentionsWithdrawal && expressesDistress) {
    return `Sinto muito que estejas preocupado com a retirada. Consulta o /historico para ver o estado e a data do pedido. Se já tiver sido aprovado há mais de 24 horas úteis e o valor não chegou, contacta o suporte oficial pelo canal oficial.`;
  }

  const asksHowToWithdraw = [
    'como sacar', 'como retirar', 'como levantar', 'como fazer um saque',
    'como solicitar uma retirada', 'como funciona o saque', 'como posso realizar uma retirada',
    'como posso fazer uma retirada', 'posso realizar uma retirada', 'posso fazer um saque',
    'como posso sacar', 'como posso retirar',
  ].some((phrase) => normalized.includes(phrase));
  if (asksHowToWithdraw) {
    return `Claro! Para iniciar uma retirada, podes enviar /retirar ou dizer-me o valor que pretendes levantar (mínimo de ${formatKZ(params.minAmount)}, taxa de ${params.feePercent}%). Vou orientar-te durante o processo.`;
  }

  const asksAboutDay = /\b(como foi (o teu|teu|o seu|seu) dia)\b/.test(normalized);
  if (asksAboutDay) return 'Por aqui está tudo bem, obrigado! E contigo, como foi o teu dia?';

  const asksWellbeing = /\b(como estas|como esta|estas bem|esta bem|tudo bem|tudo bom|como vai)\b/.test(normalized);
  if (asksWellbeing) return 'Estou bem, obrigado por perguntares! E tu, como estás?';

  const englishGreeting = /^(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(normalized);
  if (englishGreeting) {
    return 'Olá! Por favor, comunica comigo em português para eu te ajudar melhor. Como posso ajudar com a tua retirada?';
  }

  const isGreeting = /^(ola|oi|opa|bom dia|boa tarde|boa noite|alo|e ?ai|txe)\b/.test(normalized);
  if (normalized.startsWith('feliz noite')) return 'Feliz noite! Espero que esteja tudo bem contigo. Como posso ajudar com a tua retirada?';
  if (normalized.startsWith('bom dia')) return 'Bom dia! Como estás? Se precisares de ajuda com uma retirada, estou por aqui.';
  if (normalized.startsWith('boa tarde')) return 'Boa tarde! Como vai o teu dia? Posso ajudar com alguma questão sobre a tua retirada?';
  if (normalized.startsWith('boa noite')) return 'Boa noite! Como estás? Se tiveres alguma dúvida sobre uma retirada, fala comigo.';
  if (isGreeting) return selectResponse('saudacao', normalized, responses);

  for (const [topic, phrases] of topicPatterns) {
    if (phrases.some((phrase) => normalized.includes(phrase))) {
      return selectResponse(topic, normalized, responses);
    }
  }

  return selectResponse('fallback', normalized, responses);
}
