// services/db/campaignLore.service.ts
// Opera sobre a tabela `campaign_lore`, permitindo inserir e consultar entradas
// de diário/memória consolidadas para cada campanha.

import { supabase } from '@/services/db/supabaseClient';
import { CampaignLore } from '@/types/lore';
import { createAppError, isAppError } from '@/types/game';
import { toSnakeCase, toCamelCase } from '@/utils/dbUtils';
import { logEvent } from '@/store/devLogStore';

const TABLE = 'campaign_lore';

export const findLoreEntryByCategory = async (campaignId: string, category: string): Promise<CampaignLore | null> => {
    const context = 'campaignLore.service.findLoreEntryByCategory';
    const startTime = Date.now();
    try {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('category', category)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw createAppError('SUPABASE_ERROR', 'Falha ao buscar entrada de lore.', error, context);
        }

        if (data) {
            logEvent({
                type: 'db',
                functionName: context,
                params: { category },
                response: data.id,
                responseTimeMs: Date.now() - startTime,
            });
            return toCamelCase(data) as CampaignLore;
        }
        return null;
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Erro desconhecido ao consultar campaign_lore.', error, context);
    }
};

export const insertLoreEntry = async (entry: {
    campaignId: string;
    category: string;
    content: string;
    embedding?: number[];
}): Promise<CampaignLore> => {
    const context = 'campaignLore.service.insertLoreEntry';
    const startTime = Date.now();
    const payload = toSnakeCase({
        campaignId: entry.campaignId,
        category: entry.category,
        content: entry.content,
        embedding: entry.embedding,
    });

    try {
        const { data, error } = await supabase
            .from(TABLE)
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao salvar entrada de lore.', error, context);
        }

        const lore = toCamelCase(data) as CampaignLore;
        logEvent({
            type: 'db',
            functionName: context,
            params: { category: entry.category },
            response: lore.id,
            responseTimeMs: Date.now() - startTime,
        });
        return lore;
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Erro desconhecido ao criar entrada de lore.', error, context);
    }
};
