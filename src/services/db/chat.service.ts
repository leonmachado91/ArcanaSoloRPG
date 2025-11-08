// services/db/chat.service.ts
// Este serviço é responsável por toda a lógica de acesso a dados
// relacionada ao histórico de chat (salvar e apagar mensagens).

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError, isAppError } from '@/types/game';
import { Message } from '@/types/chat';
import { toSnakeCase } from '@/utils/dbUtils';

/**
 * Salva uma única mensagem de chat no banco de dados.
 * @param message O objeto da mensagem a ser salvo.
 * @param campaignId O ID da campanha à qual a mensagem pertence.
 */
export async function saveChatMessage(message: Message, campaignId: string): Promise<void> {
    const startTime = Date.now();
    const context = 'chat.service.saveChatMessage';

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw createAppError('SUPABASE_ERROR', 'Falha ao obter sessão para salvar mensagem.', sessionError, context);
        if (!session?.user) throw createAppError('AUTH_ERROR', 'Usuário não autenticado. Não é possível salvar a mensagem.', null, context);

        const metadata: any = {
            authorName: message.authorName,
        };
        if (message.diceRoll) metadata.diceRoll = message.diceRoll;
        if (message.cardDraw) metadata.cardDraw = message.cardDraw;
        if (message.imageUrl) metadata.imageUrl = message.imageUrl;
        // FIX: Ensure the isOffTopic flag is persisted in the metadata.
        if (message.isOffTopic) metadata.isOffTopic = true;
        
        let authorEntityId: string | null = null;
        if (message.authorId !== 'system' && message.authorId !== 'master') {
            authorEntityId = message.authorId;
        }

        const chatData = {
            id: message.id,
            campaignId: campaignId,
            sceneId: message.sceneId,
            authorEntityId: authorEntityId,
            messageType: message.type,
            content: message.text,
            metadata: metadata,
        };

        const { error } = await supabase.from('chat_history').upsert(toSnakeCase(chatData));

        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao salvar a mensagem do chat.', error, context);
        }

        logEvent({ type: 'db', functionName: context, params: { messageId: message.id }, response: "Success", responseTimeMs: Date.now() - startTime });

    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('UNKNOWN_ERROR', 'Um erro desconhecido ocorreu ao salvar a mensagem do chat.', e, context);
    }
}

/**
 * Atualiza uma única mensagem de chat, principalmente para persistir resultados de interações como rolagens de dados.
 * @param messageId O ID da mensagem a ser atualizada.
 * @param updatedData Um objeto parcial da mensagem contendo os dados a serem atualizados (ex: `{ diceRoll: ... }`).
 */
export async function updateChatMessage(messageId: string, updatedData: Partial<Message>): Promise<void> {
    const startTime = Date.now();
    const context = 'chat.service.updateChatMessage';
    try {
        const { text, ...metadataUpdates } = updatedData;
        const updates: { content?: string; metadata?: any } = {};

        if (text) {
            updates.content = text;
        }

        if (Object.keys(metadataUpdates).length > 0) {
            const { data: existingMessage, error: fetchError } = await supabase
                .from('chat_history')
                .select('metadata')
                .eq('id', messageId)
                .single();

            if (fetchError) {
                throw createAppError('SUPABASE_ERROR', 'Falha ao buscar a mensagem para atualizar metadados.', fetchError, context);
            }
            
            const newMetadataPayload = toSnakeCase(metadataUpdates);

            updates.metadata = {
                ...(existingMessage?.metadata || {}),
                ...newMetadataPayload
            };
        }

        if (Object.keys(updates).length === 0) {
            logEvent({ type: 'system', message: 'Update chat message called with no data to update.', payload: { messageId, updatedData } });
            return;
        }

        const { error } = await supabase
            .from('chat_history')
            .update(updates)
            .eq('id', messageId);

        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao atualizar a mensagem do chat no banco de dados.', error, context);
        }

        logEvent({ type: 'db', functionName: context, params: { messageId, updates }, response: "Success", responseTimeMs: Date.now() - startTime });

    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('UNKNOWN_ERROR', 'Um erro desconhecido ocorreu ao atualizar a mensagem do chat.', e, context);
    }
}


/**
 * Apaga uma única mensagem do chat.
 * @param messageId O ID da mensagem a ser apagada.
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
    const startTime = Date.now();
    const context = 'chat.service.deleteChatMessage';
    try {
        const { error } = await supabase.from('chat_history').delete().eq('id', messageId);
        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao apagar a mensagem do chat.', error, context);
        }
        logEvent({ type: 'db', functionName: context, params: { messageId }, response: "Success", responseTimeMs: Date.now() - startTime });
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('UNKNOWN_ERROR', 'Um erro desconhecido ocorreu ao apagar a mensagem.', e, context);
    }
}