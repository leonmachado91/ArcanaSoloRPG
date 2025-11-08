// services/ai/tools/handlers/knowledgeQueryHandler.ts
import { useGameStore } from '@/store/useGameStore';
import { logEvent } from '@/store/devLogStore';
import { createAppError } from '@/types/game';
import { generateEmbedding } from '../../embeddingService';
import { queryKnowledgeBase, MatchedDocument } from '../../../db/rag.service';
import { getConfig } from '../../../configService';

/**
 * Formata os documentos encontrados em uma string de texto para ser enviada à IA.
 * @param documents A lista de documentos correspondentes retornados pela busca RAG.
 * @returns Uma string formatada com o conhecimento recuperado.
 */
const formatResultsForAI = (documents: MatchedDocument[]): string => {
    if (documents.length === 0) {
        return "Nenhuma informação relevante encontrada na memória de longo prazo para esta consulta.";
    }

    const formattedDocuments = documents.map(doc => {
        const header = `### Fonte: ${doc.source} (Similaridade: ${doc.similarity.toFixed(2)})`;
        const contentLines = doc.content.split('\n').filter(line => line.trim() !== '');

        // Heurística: se todas as linhas não vazias contêm ':', trata-se de pares chave-valor.
        const isKeyValue = contentLines.length > 0 && contentLines.every(line => line.includes(':'));

        let formattedContent: string;

        if (isKeyValue) {
            formattedContent = contentLines.map(line => {
                const parts = line.split(':');
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                return `- **${key}:** ${value}`;
            }).join('\n');
        } else {
            // Se for um bloco de texto simples, apenas o apresentamos.
            formattedContent = doc.content;
        }

        return `${header}\n${formattedContent}`;
    }).join('\n\n');

    return `Aqui estão as informações mais relevantes encontradas na memória da campanha:\n\n${formattedDocuments}`;
};


/**
 * Orquestra a busca de conhecimento na memória de longo prazo da campanha.
 * @param queryText A pergunta em linguagem natural feita pela IA.
 * @param searchDomain O domínio da busca ('gameState' ou 'rules') para otimizar os parâmetros.
 * @returns Uma string formatada com as informações encontradas, ou uma mensagem de erro.
 */
export const handleKnowledgeQuery = async (
    queryText: string,
    searchDomain: 'gameState' | 'rules' = 'gameState'
): Promise<string> => {
    const context = 'tool.handler.knowledgeQuery';
    const state = useGameStore.getState();
    const campaignId = state.campaign.id;
    const config = getConfig().rag;

    if (!campaignId) {
        throw createAppError('VALIDATION_ERROR', `ID da campanha não encontrado no estado. A busca de memória não pode ser executada.`, null, context);
    }
    
    if (!queryText || queryText.trim() === '') {
        return "Consulta vazia recebida. Por favor, forneça um texto para a busca.";
    }

    try {
        const isRulesSearch = searchDomain === 'rules';
        const matchThreshold = isRulesSearch ? config.rulesMatchThreshold : config.gameStateMatchThreshold;
        const matchCount = isRulesSearch ? config.rulesMatchCount : config.gameStateMatchCount;

        logEvent({ type: 'system', message: `[RAG] Iniciando busca de conhecimento com a consulta: "${queryText}" (Domínio: ${searchDomain})` });


        // 1. Gerar o embedding para a consulta.
        const embedding = await generateEmbedding(queryText);
        if (!embedding) {
            throw createAppError('GEMINI_API_ERROR', 'Falha ao gerar o vetor de embedding para a consulta de memória.', null, context);
        }

        // 2. Executar a busca vetorial no banco de dados.
        const matchedDocuments = await queryKnowledgeBase(
            campaignId,
            embedding,
            matchThreshold,
            matchCount,
            searchDomain
        );

        // 3. Formatar os resultados para a IA.
        const formattedResult = formatResultsForAI(matchedDocuments);

        logEvent({
            type: 'system',
            message: `[RAG] Busca de conhecimento concluída. ${matchedDocuments.length} documento(s) encontrado(s).`,
            payload: { query: queryText, domain: searchDomain, results: formattedResult }
        });

        return formattedResult;

    } catch (error) {
        console.error(`[${context}] Erro ao executar a busca de conhecimento:`, error);
        logEvent({
            type: 'system',
            message: `[RAG] ERRO durante a busca de conhecimento.`,
            payload: { query: queryText, error }
        });
        
        // Retorna uma mensagem de erro amigável para a IA, para que ela possa tentar novamente ou informar o jogador.
        return `Ocorreu um erro ao tentar acessar a memória de longo prazo. Detalhes: ${error instanceof Error ? error.message : String(error)}`;
    }
};