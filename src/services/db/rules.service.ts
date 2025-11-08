// services/db/rules.service.ts
import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError, isAppError } from '@/types/game';
import { toCamelCase } from '@/utils/dbUtils';
import { Rule, RuleUpdatePayload } from '@/types/rules';

/**
 * Busca todas as regras da tabela 'rules'.
 */
export async function fetchAllRules(): Promise<Rule[]> {
    const startTime = Date.now();
    const context = 'rules.service.fetchAllRules';
    try {
        const { data, error } = await supabase.from('rules').select('*');
        if (error) throw createAppError('SUPABASE_ERROR', 'Falha ao buscar as regras do jogo.', error, context);
        
        logEvent({ type: 'db', functionName: context, params: {}, response: data ? `Fetched ${data.length} rules.` : 'No data', responseTimeMs: Date.now() - startTime });
        return toCamelCase(data) || [];
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao buscar as regras do jogo.', e, context);
    }
}

/**
 * Atualiza/insere múltiplas regras no banco de dados em uma única transação usando uma RPC.
 * @param rulesToUpsert Um array de objetos de regras a serem atualizados.
 */
export async function upsertRules(rulesToUpsert: RuleUpdatePayload[]): Promise<void> {
    const startTime = Date.now();
    const context = 'rules.service.upsertRules';
    try {
        // A RPC `upsert_rules_batch` espera o payload em snake_case se a conversão automática não estiver habilitada.
        // Como o payload da RPC é um JSONB, a conversão manual não é necessária aqui, o Supabase client lida com isso.
        const { error } = await supabase.rpc('upsert_rules_batch', { rules_to_upsert: rulesToUpsert });

        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao atualizar as regras em lote.', error, context);
        }

        logEvent({
            type: 'db',
            functionName: context,
            params: { count: rulesToUpsert.length },
            response: 'Success',
            responseTimeMs: Date.now() - startTime
        });
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('UNKNOWN_ERROR', 'Um erro inesperado ocorreu ao atualizar as regras.', e, context);
    }
}