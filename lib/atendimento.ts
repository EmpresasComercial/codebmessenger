import { supabase } from './supabase';
import { logger } from './logger';

export interface AtendimentoLinks {
  telegram?: string;
  app_atualizado?: string;
  whatsapp_gerente?: string;
  whatsapp_grupo_vendas?: string;
  whatsapp?: string;
  [key: string]: any;
}

let cachedLinks: AtendimentoLinks | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minuto

/**
 * Consulta a tabela 'atendimento_links' no banco de dados e retorna o objeto de links JSONB.
 */
export async function getAtendimentoLinks(): Promise<AtendimentoLinks | null> {
  const now = Date.now();
  if (cachedLinks && now - cacheTimestamp < CACHE_TTL) {
    return cachedLinks;
  }

  try {
    const { data, error } = await (supabase.rpc as any)('get_atendimento_links_mcpn');

    if (error) {
      logger.error('atendimento', 'Erro ao consultar atendimento_links:', error);
      return cachedLinks;
    }

    if (data && typeof data === 'object') {
      cachedLinks = data as AtendimentoLinks;
      cacheTimestamp = now;
      return cachedLinks;
    }
  } catch (err) {
    logger.error('atendimento', 'Falha na requisição de atendimento_links:', err);
  }

  return cachedLinks;
}

/**
 * Abre o link do grupo/conversa do WhatsApp obtido dinamicamente da tabela de atendimentos.
 */
export async function openWhatsAppAtendimento(): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    const links = await getAtendimentoLinks();
    
    // Prioriza o grupo de vendas/comunidade WhatsApp ou gerente de suporte
    const targetUrl = links?.whatsapp_grupo_vendas || links?.whatsapp_gerente || links?.whatsapp;

    if (targetUrl && targetUrl.startsWith('http')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return { success: true, url: targetUrl };
    }

    return { success: false, message: 'Link do WhatsApp não configurado no banco de dados.' };
  } catch (err: any) {
    logger.error('atendimento', 'Erro ao abrir WhatsApp do atendimento:', err);
    return { success: false, message: err.message || 'Erro ao conectar ao WhatsApp.' };
  }
}
