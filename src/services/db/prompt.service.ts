// services/db/prompt.service.ts
// Este serviço é responsável por buscar os prompts da IA do banco de dados,
// permitindo que o conteúdo criativo seja gerenciado dinamicamente.

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError, isAppError } from '@/types/game';
import { toCamelCase } from '@/utils/dbUtils';

/**
 * Define a estrutura de um prompt, conforme armazenado no banco de dados.
 */
export interface Prompt {
    id: number;
    createdAt: string;
    key: string;
    content: string;
    description: string | null;
}

/**
 * Busca todos os prompts da tabela 'prompts'.
 * @returns Uma promessa que resolve com um array de objetos Prompt.
 * @throws {AppError} Se a busca no Supabase falhar.
 */
export async function fetchAllPrompts(): Promise<Prompt[]> {
    const startTime = Date.now();
    const context = 'prompt.service.fetchAllPrompts';
    try {
        const { data, error } = await supabase
            .from('prompts')
            .select('*');

        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao buscar os prompts da IA.', error, context);
        }

        logEvent({
            type: 'db',
            functionName: context,
            params: {},
            response: data ? `Fetched ${data.length} prompts.` : 'No data',
            responseTimeMs: Date.now() - startTime
        });

        return toCamelCase(data) || [];

    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao buscar os prompts.', e, context);
    }
}

/**
 * Interface for the data sent to update prompts in batch.
 */
export interface PromptUpdatePayload {
    key: string;
    content: string;
    description: string | null;
}

/**
 * Atualiza ou cria múltiplos prompts no banco de dados usando `upsert`.
 * @param promptsToUpdate Um array de objetos contendo a chave, o novo conteúdo e a descrição de cada prompt a ser atualizado/criado.
 * @returns Uma promessa que resolve quando a operação é concluída.
 * @throws {AppError} Se a operação no Supabase falhar.
 */
export async function updatePrompts(promptsToUpdate: PromptUpdatePayload[]): Promise<void> {
    const startTime = Date.now();
    const context = 'prompt.service.updatePrompts';
    try {
        const { error } = await supabase
            .from('prompts')
            .upsert(promptsToUpdate, { onConflict: 'key' });

        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao atualizar/criar os prompts.', error, context);
        }

        logEvent({
            type: 'db',
            functionName: context,
            params: { count: promptsToUpdate.length },
            response: 'Success',
            responseTimeMs: Date.now() - startTime
        });

    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('UNKNOWN_ERROR', 'Um erro inesperado ocorreu ao atualizar os prompts.', e, context);
    }
}