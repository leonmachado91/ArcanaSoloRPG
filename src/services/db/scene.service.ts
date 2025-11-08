// services/db/scene.service.ts
// Este serviço é responsável por toda a lógica de acesso a dados
// relacionada a cenas (criação, atualização).

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError } from '@/types/game';
import { Scene } from '@/types/scene';
import { toSnakeCase } from '@/utils/dbUtils';

/**
 * Salva um único objeto de cena e suas entidades associadas.
 * @param scene O objeto da cena a ser salvo.
 */
export async function saveScene(scene: Scene): Promise<void> {
    const context = 'scene.service.saveScene';
    const startTime = Date.now();
    try {
        // FIX: Remove a propriedade `locationId` que não existe na tabela 'scenes' para evitar erro de schema.
        const { characterIds, locationId, ...sceneData } = scene;

        // Salva os dados principais da cena na tabela 'scenes'.
        const { error } = await supabase.from('scenes').upsert(toSnakeCase(sceneData));
        if (error) throw error;
        
        // Salva as associações de personagem na tabela de junção 'scene_entities'.
        if (characterIds && characterIds.length > 0) {
            const sceneEntitiesData = characterIds.map((charId: string) => ({
                scene_id: scene.id,
                entity_id: charId
            }));
            // Limpa as entradas existentes para esta cena antes de inserir as novas.
            await supabase.from('scene_entities').delete().eq('scene_id', scene.id);
            const { error: entityError } = await supabase.from('scene_entities').upsert(sceneEntitiesData);
            if (entityError) throw entityError;
        }

        logEvent({ type: 'db', functionName: context, params: { sceneId: scene.id }, response: 'Success', responseTimeMs: Date.now() - startTime });
    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao salvar a cena.', error, context);
    }
}

/**
 * Atualiza campos específicos de uma cena no banco de dados.
 * @param sceneId O ID da cena.
 * @param data Um objeto com os campos a serem atualizados (em camelCase).
 */
export async function updateSceneData(sceneId: string, data: Partial<Pick<Scene, 'turnCount' | 'characterIds' | 'isActive' | 'arcanaCardsDrawn'>>): Promise<void> {
    const context = 'scene.service.updateSceneData';
    const startTime = Date.now();
    try {
        const { characterIds, ...sceneFields } = data;

        if (Object.keys(sceneFields).length > 0) {
            const { error } = await supabase
                .from('scenes')
                .update(toSnakeCase(sceneFields))
                .eq('id', sceneId);
            if (error) throw error;
        }

        if (characterIds) {
            const sceneEntitiesData = characterIds.map((charId: string) => ({
                scene_id: sceneId,
                entity_id: charId
            }));
            await supabase.from('scene_entities').delete().eq('scene_id', sceneId);
            if (sceneEntitiesData.length > 0) {
                const { error: entityError } = await supabase.from('scene_entities').upsert(sceneEntitiesData);
                if (entityError) throw entityError;
            }
        }
        
        logEvent({ type: 'db', functionName: context, params: { sceneId, data }, response: 'Success', responseTimeMs: Date.now() - startTime });
    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao atualizar dados da cena.', error, context);
    }
}