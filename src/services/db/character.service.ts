// services/db/character.service.ts
// Este serviço é responsável por toda a lógica de acesso a dados
// relacionada a personagens (criação, atualização, sincronização de itens/condições).

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError } from '@/types/game';
import { Character } from '@/types/character';
import { toSnakeCase } from '@/utils/dbUtils';

/**
 * Atualiza campos específicos de um personagem no banco de dados.
 * @param entityId O ID da entidade do personagem.
 * @param data Um objeto com os campos a serem atualizados (em camelCase).
 */
export async function updateCharacterData(entityId: string, data: { objective?: string; progressPoints?: number; imageUrl?: string; unspentElementPoints?: number }): Promise<void> {
    const context = 'character.service.updateCharacterData';
    const startTime = Date.now();
    try {
        const { error } = await supabase
            .from('characters')
            .update(toSnakeCase(data))
            .eq('entity_id', entityId);

        if (error) throw error;

        logEvent({ type: 'db', functionName: context, params: { entityId, data }, response: 'Success', responseTimeMs: Date.now() - startTime });
    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao atualizar dados do personagem.', error, context);
    }
}

/**
 * Sincroniza os itens de um personagem no banco de dados, garantindo que os itens existam no catálogo.
 * @param entityId O ID da entidade do personagem.
 * @param items A lista completa de itens do personagem.
 */
export async function syncCharacterItems(entityId: string, items: Character['items']): Promise<void> {
    const context = 'character.service.syncCharacterItems';
    const startTime = Date.now();
    try {
        // 1. Garante que todos os itens existam no catálogo 'items'.
        const itemsToUpsert = items.map(item => ({ name: item.name, description: item.description || null }));
        if (itemsToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from('items').upsert(itemsToUpsert, { onConflict: 'name' });
            if (upsertError) throw upsertError;
        }

        // 2. Busca os IDs dos itens recém-garantidos.
        const itemNames = items.map(item => item.name);
        const { data: itemCatalog, error: fetchError } = await supabase.from('items').select('id, name').in('name', itemNames);
        if (fetchError) throw fetchError;
        const itemNameIdMap = new Map(itemCatalog?.map(item => [item.name, item.id]));

        // 3. Prepara os dados para a tabela de junção 'entity_inventory'.
        const inventoryData = items.map(item => ({
            entity_id: entityId,
            item_id: itemNameIdMap.get(item.name),
            quantity: item.quantity,
            configuration_details: item.item_type ? { item_type: item.item_type } : null
        })).filter(item => item.item_id);

        // 4. Apaga o inventário antigo e insere o novo.
        await supabase.from('entity_inventory').delete().eq('entity_id', entityId);
        if (inventoryData.length > 0) {
            const { error: insertError } = await supabase.from('entity_inventory').insert(inventoryData);
            if (insertError) throw insertError;
        }

        logEvent({ type: 'db', functionName: context, params: { entityId, itemCount: items.length }, response: 'Success', responseTimeMs: Date.now() - startTime });
    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao sincronizar o inventário do personagem.', error, context);
    }
}


/**
 * Sincroniza as condições de um personagem no banco de dados.
 * @param entityId O ID da entidade do personagem.
 * @param states A lista completa de condições ativas do personagem.
 */
export async function syncCharacterConditions(entityId: string, states: Character['states']): Promise<void> {
    const context = 'character.service.syncCharacterConditions';
    const startTime = Date.now();
    try {
        // 1. Busca os IDs das condições a partir do catálogo.
        const conditionNames = states.map(s => s.name);
        if (conditionNames.length === 0) {
            // Se não há condições, apenas apaga as existentes e retorna.
            await supabase.from('entity_conditions').delete().eq('entity_id', entityId);
            logEvent({ type: 'db', functionName: context, params: { entityId, stateCount: 0 }, response: 'Success', responseTimeMs: Date.now() - startTime });
            return;
        }
        const { data: conditionCatalog, error: fetchError } = await supabase.from('conditions').select('id, name').in('name', conditionNames);
        if (fetchError) throw fetchError;
        const conditionNameIdMap = new Map(conditionCatalog?.map(c => [c.name, c.id]));
        
        // 2. Prepara os dados para a tabela 'entity_conditions'.
        const entityConditionsData = states.map((state: any) => ({
            entity_id: entityId,
            condition_id: conditionNameIdMap.get(state.name),
            intensity: state.intensity || 'Leve',
            remaining_turns: state.remaining_turns,
        })).filter(c => c.condition_id);

        // 3. Apaga as condições antigas e insere as novas.
        await supabase.from('entity_conditions').delete().eq('entity_id', entityId);
        if (entityConditionsData.length > 0) {
            const { error: insertError } = await supabase.from('entity_conditions').insert(entityConditionsData);
            if (insertError) throw insertError;
        }

        logEvent({ type: 'db', functionName: context, params: { entityId, stateCount: states.length }, response: 'Success', responseTimeMs: Date.now() - startTime });
    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao sincronizar as condições do personagem.', error, context);
    }
}

/**
 * Salva um novo personagem (normalmente um NPC) no banco de dados.
 * @param character O objeto do personagem a ser criado.
 * @param campaignId O ID da campanha à qual ele pertence.
 */
export async function saveNewCharacter(character: Character, campaignId: string): Promise<void> {
    const context = 'character.service.saveNewCharacter';
    const startTime = Date.now();
    try {
        // 1. Cria a entrada na tabela 'entities'.
        const entityData = {
            id: character.id,
            campaign_id: campaignId,
            type: character.type,
        };
        const { error: entityError } = await supabase.from('entities').upsert(entityData);
        if (entityError) throw entityError;

        // 2. Cria a entrada na tabela 'characters'.
        const characterData = {
            entityId: character.id,
            name: character.name,
            age: character.age,
            description: character.description,
            history: character.history,
            characterType: character.type,
            // Adicione outros campos necessários com valores padrão se não forem fornecidos.
            personalityTraits: character.personalityTraits || [],
            imageUrl: character.imageUrl || '',
            elements: character.elements || { fire: 1, water: 1, air: 1, earth: 1 },
            progressPoints: character.progressPoints || 0,
            unspentElementPoints: character.unspentElementPoints || 0,
        };
        const { error: charError } = await supabase.from('characters').upsert(toSnakeCase(characterData));
        if (charError) throw charError;

        logEvent({ type: 'db', functionName: context, params: { characterId: character.id, name: character.name }, response: 'Success', responseTimeMs: Date.now() - startTime });

    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao salvar o novo personagem.', error, context);
    }
}