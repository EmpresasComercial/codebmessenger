import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface PaymentAssistantParams {
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  currency: string;
  processingTime: string;
  schedule: string;
  banks: Array<{
    id?: string;
    banco?: string;
    nome_banco?: string;
    titular?: string;
    nome_proprietario?: string;
    iban?: string;
    instrucoes?: string;
  }>;
  userBalance?: number;
  hasPending?: boolean;
  encryptedToken?: string;
}

const DEFAULT_PAY_PARAMS: PaymentAssistantParams = {
  minAmount: 3000,
  maxAmount: 500000,
  feePercent: 0,
  currency: 'KZ',
  processingTime: '2 a 15 minutos',
  schedule: 'Disponível 24/7 para envio de comprovativos e recargas',
  banks: [],
  userBalance: 0,
  hasPending: false,
};

let cachedPayParams: PaymentAssistantParams = { ...DEFAULT_PAY_PARAMS };

/**
 * Função segura que busca os parâmetros oficiais e criptografados do banco via RPC getpay
 */
export async function fetchPayParams(): Promise<PaymentAssistantParams> {
  try {
    const { data, error } = await supabase.rpc('getpay');
    if (!error && data && typeof data === 'object') {
      const row = data as any;
      cachedPayParams = {
        minAmount: Number(row.min_amount) || DEFAULT_PAY_PARAMS.minAmount,
        maxAmount: Number(row.max_amount) || DEFAULT_PAY_PARAMS.maxAmount,
        feePercent: Number(row.fee_percent) ?? DEFAULT_PAY_PARAMS.feePercent,
        currency: row.currency || DEFAULT_PAY_PARAMS.currency,
        processingTime: row.processing_time || DEFAULT_PAY_PARAMS.processingTime,
        schedule: row.schedule || DEFAULT_PAY_PARAMS.schedule,
        banks: Array.isArray(row.banks) ? row.banks : [],
        userBalance: Number(row.user_balance) || 0,
        hasPending: Boolean(row.has_pending),
        encryptedToken: row.encrypted_token || undefined,
      };
    }
  } catch (err) {
    logger.warn('paymentAssistantCore', 'Falha ao buscar getpay do banco, usando cache local:', err);
  }
  return cachedPayParams;
}

export function getPaymentAssistantParams(): PaymentAssistantParams {
  return cachedPayParams;
}

function formatKZ(val: number): string {
  return `${val.toLocaleString('pt-AO')} KZ`;
}

function buildDynamicResponses(params: PaymentAssistantParams) {
  const minFmt = formatKZ(params.minAmount);
  const maxFmt = formatKZ(params.maxAmount);

  return {
    greeting: [
      'Olá! Como estás? Sou o assistente de recargas. Posso ajudar com depósitos, saldo ou comprovativos.',
      'Opa! Tudo tranquilo por aí? Posso ajudar-te com recargas, saldo ou comprovativos.',
      'Olá! Como vai o teu dia? Se tiveres alguma dúvida sobre recargas, fala comigo.',
      'Olá! Tudo tranquilo por aí? Diz-me como posso ajudar com a tua carteira.',
      'Oi! Como foi o teu dia? Se precisares de carregar o saldo, posso explicar o processo.',
      'Fala! Estou por aqui para ajudar com recargas, transferências e dúvidas sobre o saldo.',
    ],
    taxas: [
      `A recarga não tem taxa da plataforma (${params.feePercent}% de taxa): depositando ${minFmt}, são creditados ${minFmt} integralmente na tua conta.`,
      `Não cobramos taxa sobre recargas (taxa de ${params.feePercent}%). O valor enviado é registado integralmente.`,
      `A taxa da plataforma para recarregar é ${params.feePercent}%. Se o teu banco cobrar custos pela transferência bancária, esse custo depende exclusivamente do teu banco.`,
    ],
    limites: [
      `O valor mínimo por recarga é de ${minFmt} e o máximo é de ${maxFmt} por operação. Para iniciar, envia /depositar.`,
      `Podes recarregar entre ${minFmt} e ${maxFmt} por operação. Se precisares de carregar valores superiores, faz operações separadas.`,
    ],
    prazo: [
      `A validação costuma levar cerca de ${params.processingTime}, mas pode variar se houver instabilidade interbancária. Consulta o /historico para acompanhar.`,
      `Depois da transferência e do envio do comprovativo, a confirmação costuma ocorrer em ${params.processingTime}. Acompanha o estado em /historico.`,
    ],
    nao_creditado: [
      'Compreendo a preocupação. Confirma primeiro o estado da recarga no /historico. Se já enviaste o comprovativo há mais de 20 minutos e continua sem atualização, contacta o suporte oficial e envia a referência do pedido. Não partilhes palavras-passe nem códigos.',
      'Vamos verificar com calma: consulta o /historico para ver se está pendente ou aprovado. Se já passaram mais de 20 minutos desde o envio do comprovativo, fala com o suporte oficial com a referência da recarga. Não consigo confirmar a aprovação sem o estado do pedido.',
    ],
    apos_recarga: [
      'Depois de enviares o comprovativo, acompanha o pedido em /historico. Quando a recarga aparecer como aprovada, confirma o valor atualizado com /saldo. Se continuar pendente ou o saldo não atualizar, contacta o suporte oficial com a referência.',
    ],
    comprovativo: [
      'Depois de fazeres a transferência, anexa aqui uma imagem nítida ou o PDF do comprovativo. Confere se o valor, a data e os dados de destino estão legíveis.',
      'Quando terminares a transferência, envia o comprovativo pelo ícone de anexo. A equipa precisa validar os dados antes de o saldo ser confirmado.',
    ],
    como_depositar: [
      `Para recarregar, envia /depositar, escolhe um valor entre ${minFmt} e ${maxFmt}, seleciona um dos bancos autorizados da plataforma, faz a transferência e anexa o comprovativo aqui. Depois acompanha o estado em /historico.`,
      `É simples: começa com /depositar, escolhe o valor e o banco de arrecadação indicado no ecrã, faz a transferência e envia o comprovativo pelo chat. A confirmação ocorre em ${params.processingTime}.`,
    ],
    burla: [
      'Percebo a tua preocupação, sobretudo se já tiveste uma má experiência noutra plataforma. Não consigo confirmar por esta conversa se uma situação é legítima. Usa apenas os dados bancários apresentados dentro da aplicação e os canais oficiais; não envies palavras-passe, códigos de verificação nem pagues valores extra para “libertar” um depósito. Se algo não corresponder ao que aparece na aplicação, não transfiras e contacta o suporte oficial.',
      'É compreensível ficares desconfiado depois de perder dinheiro noutro serviço. Não vou garantir que uma operação é segura sem verificação. Confirma o destinatário e o IBAN dentro da aplicação, não partilhes códigos ou palavras-passe e não pagues taxas adicionais fora do fluxo oficial. Em caso de dúvida, para a transferência e fala com o suporte oficial.',
    ],
    acolhimento: [
      'Lamento que estejas preocupado. Depois de uma experiência má, é normal quereres confirmar tudo com cuidado. Não faças uma transferência enquanto tiveres dúvidas: verifica os dados dentro da aplicação e, se precisares, contacta o suporte oficial.',
      'Percebo como isso pode deixar-te inseguro. Vamos por partes e sem pressa: confirma os dados de pagamento na aplicação antes de transferir. Se quiseres, diz-me qual é a tua dúvida sobre a recarga.',
    ],
    agradecimento: [
      'De nada! Se precisares de ajuda com outra recarga ou com o histórico, estou por aqui.',
      'Disponha! Quando precisares, posso orientar-te com o depósito ou com o comprovativo.',
    ],
    fora_dominio: [
      'Este assistente trata de recargas e depósitos. Para uma retirada, abre a Wallet/Retirada no menu da aplicação.',
    ],
    fallback: [
      `Quero ajudar. Posso esclarecer taxas (${params.feePercent}%), limites (${minFmt} a ${maxFmt}), prazo de confirmação (${params.processingTime}) ou comprovativos. Também podes enviar /depositar para começar.`,
      'Não percebi bem o que precisas. A tua dúvida é sobre recarregar, o prazo, o valor, o comprovativo ou o saldo?',
    ],
  };
}

type ResponseTopic = keyof ReturnType<typeof buildDynamicResponses>;

function normalize(message: string): string {
  return message
    .toLocaleLowerCase('pt')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectResponse(topic: ResponseTopic, message: string, responsesObj: ReturnType<typeof buildDynamicResponses>): string {
  const options = responsesObj[topic];
  let hash = 0;
  for (let index = 0; index < message.length; index += 1) {
    hash = (hash * 31 + message.charCodeAt(index)) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

export function getPaymentAssistantResponse(
  message: string,
  previousAssistantMessage = '',
  customParams?: Partial<PaymentAssistantParams>
): string {
  const params: PaymentAssistantParams = { ...cachedPayParams, ...customParams };
  const responses = buildDynamicResponses(params);
  const normalized = normalize(message);
  const previous = normalize(previousAssistantMessage);

  const positiveWellbeingReply =
    /\b(tambem|igualmente)\b/.test(normalized) &&
    /\b(bem|otimo|otima|tranquilo|tranquila|tudo certo)\b/.test(normalized);
  if (positiveWellbeingReply && /\b(como estas|como esta|tudo bem|como vai|como foi o teu dia)\b/.test(previous)) {
    return 'Que bom saber que estás bem! Como posso ajudar-te com a tua recarga hoje?';
  }
  if (/\b(como foi (o teu|teu|o seu|seu) dia)\b/.test(previous) && /\b(bem|bom|boa|otimo|otima|tranquilo|tranquila)\b/.test(normalized)) {
    return 'Que bom! Espero que corra tudo bem contigo. Como posso ajudar-te com a recarga?';
  }

  const withdrawalTopic = /\b(saque|saquei|retirada|retirar|levantar|levantamento)\b/.test(normalized);
  const rechargeTopic = /\b(recarga|recarregar|recarrega|carregamento|deposito|depositar|transferencia|transferir|carregar saldo|carregar carteira|carregar conta|adicionar saldo|colocar saldo|meter saldo|meter dinheiro)\b/.test(normalized);
  if (withdrawalTopic && !rechargeTopic) return selectResponse('fora_dominio', normalized, responses);

  const asksAfterRecharge =
    ['depois de', 'apos'].some((phrase) => normalized.includes(phrase)) &&
    ['depositar', 'deposito', 'recarregar', 'recarga', 'carregar', 'transferencia'].some((word) => normalized.includes(word)) &&
    ['o que', 'fazer', 'agora', 'sucesso', 'concluido'].some((word) => normalized.includes(word));
  if (asksAfterRecharge) return selectResponse('apos_recarga', normalized, responses);

  const mentionsLoss = /\b(perdi|perdido|perdida)\b.{0,35}\b(dinheiro|plataforma|plataformas)\b/.test(normalized);
  if (/\b(burla|fraude|golpe|scam|enganado|enganada|perdi dinheiro|perdido dinheiro)\b/.test(normalized) || mentionsLoss) {
    return selectResponse('burla', normalized, responses);
  }

  const notCredited = /\b(nao caiu|nao entrou|nao apareceu|nao recebi|nao foi creditado|ainda pendente|nao refletiu)\b/.test(normalized);
  const refersToRecharge = rechargeTopic || /\b(saldo|comprovativo|comprovante|carreguei|carregado|transferi|transferencia|deposito|dinheiro)\b/.test(normalized);
  if (notCredited && refersToRecharge) return selectResponse('nao_creditado', normalized, responses);

  if (/\b(comprovativo|comprovante|recibo|print)\b/.test(normalized)) {
    return selectResponse('comprovativo', normalized, responses);
  }

  if (/\b(medo|preocupado|preocupada|ansioso|ansiosa|nervoso|nervosa|inseguro|insegura|perdi dinheiro)\b/.test(normalized)) {
    return selectResponse('acolhimento', normalized, responses);
  }

  if (/\b(taxa|taxas|custa|cobram|cobranca|comissao)\b/.test(normalized)) {
    return selectResponse('taxas', normalized, responses);
  }

  if (/\b(minimo|maximo|limite|valor minimo|valor maximo|quanto posso)\b/.test(normalized)) {
    return selectResponse('limites', normalized, responses);
  }

  if (/\b(quanto tempo|demora|prazo|quando cai|quando entra|quando reflete|refletir|creditado)\b/.test(normalized)) {
    return selectResponse('prazo', normalized, responses);
  }

  if (/\b(como depositar|como recarregar|como carregar|como fazer deposito|como transferir|quero depositar|quero recarregar)\b/.test(normalized)) {
    return selectResponse('como_depositar', normalized, responses);
  }

  if (/\b(obrigado|obrigada|agradeco|valeu|tamo junto|muito bom)\b/.test(normalized)) {
    return selectResponse('agradecimento', normalized, responses);
  }

  if (/\b(como estas|como esta|estas bem|esta bem|tudo bem|tudo bom|como vai)\b/.test(normalized)) {
    return 'Estou bem, obrigado por perguntares! E tu, como estás?';
  }

  if (normalized.startsWith('bom dia')) return 'Bom dia! Como estás? Posso ajudar-te com alguma questão sobre recargas?';
  if (normalized.startsWith('boa tarde')) return 'Boa tarde! Como vai o teu dia? Se precisares, estou aqui para ajudar com a recarga.';
  if (normalized.startsWith('boa noite') || normalized.startsWith('feliz noite')) {
    return 'Boa noite! Espero que esteja tudo bem contigo. Como posso ajudar com a tua recarga?';
  }

  if (/^(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(normalized)) {
    return 'Olá! Por favor, fala comigo em português para eu te ajudar melhor com a tua recarga.';
  }

  if (/\b(como estas|como esta|estas bem|esta bem|tudo bem|tudo bom|como vai|como foi o teu dia|como foi seu dia)\b/.test(normalized)) {
    return selectResponse('greeting', normalized, responses);
  }

  if (/^(ola|oi|opa|bom dia|boa tarde|boa noite|feliz noite|alo|e ai|eae|fala)\b/.test(normalized)) {
    return selectResponse('greeting', normalized, responses);
  }

  if (/\b(depositar|deposito|recarga|recarregar|carregamento|transferir|transferencia|carregar saldo|carregar carteira|carregar conta|aumentar saldo|colocar saldo|meter saldo|meter dinheiro)\b/.test(normalized)) {
    return selectResponse('como_depositar', normalized, responses);
  }

  return selectResponse('fallback', normalized, responses);
}
