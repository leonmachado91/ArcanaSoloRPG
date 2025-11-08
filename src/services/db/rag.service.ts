// services/db/rag.service.ts
// Este serviço é a ponte entre a aplicação e a funcionalidade de busca vetorial (RAG)
// no Supabase. Ele encapsula a chamada à função RPC `match_campaign_documents`.

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError, isAppError } from '@/types/game';

/**
 * Define a estrutura de um documento retornado pela função de busca vetorial.
 */
export interface MatchedDocument {
    source: string;
    content: string;
    similarity: number;
}

/**
 * Consulta a base de conhecimento de uma campanha usando um embedding vetorial.
 * @param campaignId O ID da campanha a ser pesquisada.
 * @param embedding O vetor de embedding da consulta.
 * @param matchThreshold O limiar mínimo de similaridade para um resultado ser considerado.
 * @param matchCount O número máximo de resultados a serem retornados.
 * @param searchDomain O domínio da busca ('gameState' ou 'rules') para direcionar a consulta.
 * @returns Uma promessa que resolve com uma lista de documentos correspondentes.
 * @throws {AppError} Se a chamada RPC falhar.
 */
export async function queryKnowledgeBase(
    campaignId: string,
    embedding: number[],
    matchThreshold: number,
    matchCount: number,
    searchDomain: 'gameState' | 'rules'
): Promise<MatchedDocument[]> {
    const startTime = Date.now();
    const context = 'rag.service.queryKnowledgeBase';

    try {
        const { data, error } = await supabase.rpc('match_campaign_documents', {
            campaign_id_input: campaignId,
            query_embedding: embedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            search_domain_input: searchDomain,
        });

        if (error) {
            // Trata erros específicos de 'pgvector', como dimensões de vetor incorretas.
            if (error.message.includes('expected dimension')) {
                 throw createAppError('SUPABASE_ERROR', `A busca de memória falhou devido a uma incompatibilidade de vetores. Detalhes: ${error.message}`, error, context);
            }
            throw createAppError('SUPABASE_ERROR', 'Falha ao executar a busca na memória de longo prazo.', error, context);
        }

        logEvent({
            type: 'db',
            functionName: context,
            params: { campaignId, matchThreshold, matchCount, searchDomain },
            response: data ? `Encontrados ${data.length} documentos relevantes.` : 'Nenhum dado',
            responseTimeMs: Date.now() - startTime
        });
        
        return (data as MatchedDocument[]) || [];

    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao consultar a memória de longo prazo.', e, context);
    }
}