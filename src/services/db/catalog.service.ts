// services/db/catalog.service.ts
// Este serviço é responsável por buscar dados de "catálogo" do Supabase.
// Catálogos são tabelas de dados que são lidas com frequência mas raramente modificadas,
// como a lista de Vantagens, Condições, Cartas do Arcana e Itens.

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { TraitDefinition, ConditionDefinition } from '@/types/character';
import { createAppError, isAppError } from '@/types/game';
import { ArcanaCard } from '@/types/chat';

/**
 * Busca todas as Vantagens e Desvantagens da tabela 'traits'.
 */
export async function fetchAllTraits(): Promise<TraitDefinition[]> {
    const startTime = Date.now();
    const context = 'catalog.service.fetchAllTraits';
    try {
        const { data, error } = await supabase.from('traits').select('*').order('id', { ascending: true });
        if (error) throw createAppError('SUPABASE_ERROR', 'Falha ao buscar Vantagens/Desvantagens.', error, context);
        logEvent({ type: 'db', functionName: context, params: {}, response: data ? `Fetched ${data.length} traits.` : 'No data', responseTimeMs: Date.now() - startTime });
        return (data as TraitDefinition[]) || [];
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao buscar traits.', e, context);
    }
}


/**
 * Busca todas as Condições da tabela 'conditions'.
 */
export async function fetchAllConditions(): Promise<ConditionDefinition[]> {
    const startTime = Date.now();
    const context = 'catalog.service.fetchAllConditions';
    try {
        const { data, error } = await supabase.from('conditions').select('*').order('id', { ascending: true });
        if (error) throw createAppError('SUPABASE_ERROR', 'Falha ao buscar Condições.', error, context);
        logEvent({ type: 'db', functionName: context, params: {}, response: data ? `Fetched ${data.length} conditions.` : 'No data', responseTimeMs: Date.now() - startTime });
        return (data as ConditionDefinition[]) || [];
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao buscar conditions.', e, context);
    }
}


/**
 * Busca todas as cartas do Arcana.
 */
export async function fetchAllArcanaCards(): Promise<ArcanaCard[]> {
    const startTime = Date.now();
    const context = 'catalog.service.fetchAllArcanaCards';
    try {
        const { data, error } = await supabase.from('arcana_cards').select('*').order('id', { ascending: true });
        if (error) throw createAppError('SUPABASE_ERROR', 'Falha ao buscar as cartas do Arcana.', error, context);
        logEvent({ type: 'db', functionName: context, params: {}, response: data ? `Fetched ${data.length} cards.` : 'No data', responseTimeMs: Date.now() - startTime });
        return (data as ArcanaCard[]) || [];
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao buscar as cartas do Arcana.', e, context);
    }
}

/**
 * Busca todos os itens do catálogo.
 */
export async function fetchAllItems(): Promise<{ id: string, name: string, description: string }[]> {
    const startTime = Date.now();
    const context = 'catalog.service.fetchAllItems';
    try {
        const { data, error } = await supabase.from('items').select('id, name, description');
        if (error) throw createAppError('SUPABASE_ERROR', 'Falha ao buscar o catálogo de itens.', error, context);
        logEvent({ type: 'db', functionName: context, params: {}, response: data ? `Fetched ${data.length} items.` : 'No data', responseTimeMs: Date.now() - startTime });
        return data || [];
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao buscar o catálogo de itens.', e, context);
    }
}
