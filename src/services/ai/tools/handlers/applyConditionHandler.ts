// services/ai/tools/handlers/applyConditionHandler.ts
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { useCatalogStore } from '@/store/catalogStore';
import { logEvent } from '@/store/devLogStore';
import * as characterService from '@/services/db/character.service';
import * as chatService from '@/services/db/chat.service';
import { createAppError } from '@/types/game';
import { Message } from '@/types/chat';
import { gameMasterService } from '@/services/gameMasterService';
import { findCharacter } from '@/utils/characterUtils';

/**
 * Orquestra a aplicação de uma condição a um personagem.
 * Atualiza o DB, o estado local, posta uma mensagem no chat e notifica a IA.
 */
export const handleApplyCondition = async (
    characterId: string,
    conditionName: string,
    intensity: 'Leve' | 'Moderado' | 'Grave',
    reason: string
): Promise<{ conditionName: string; intensity: 'Leve' | 'Moderado' | 'Grave'; effect: string; }> => {
    const context = 'tool.handler.applyCondition';
    const state = useGameStore.getState();
    const { dispatch, playerCharacter, npcs } = state;
    const { campaign } = state;
    const { conditions: allConditions, traits } = useCatalogStore.getState();
    const allAdvantageTraits = traits.filter(trait => trait.type === 'advantage');
    const allCharacters = [playerCharacter, ...npcs];

    const character = findCharacter(characterId, allCharacters);
    if (!character) {
        throw createAppError('VALIDATION_ERROR', `Personagem com ID/Nome '${characterId}' não encontrado.`, null, context);
    }
    
    const conditionInfo = allConditions.find(c => c.name.toLowerCase() === conditionName.toLowerCase());
    if (!conditionInfo) {
        throw createAppError('VALIDATION_ERROR', `Condição '${conditionName}' não encontrada no catálogo.`, null, context);
    }
    
    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        throw createAppError('UNKNOWN_ERROR', 'Nenhuma cena ativa para aplicar a condição.', null, context);
    }

    const normalizedIntensity = (intensity.charAt(0).toUpperCase() + intensity.slice(1).toLowerCase()) as 'Leve' | 'Moderado' | 'Grave';

    let description = '';
    switch (normalizedIntensity) {
        case 'Leve': description = conditionInfo.level_1_description; break;
        case 'Moderado': description = conditionInfo.level_2_description; break;
        case 'Grave': description = conditionInfo.level_3_description; break;
    }

    const newAppliedState: any = {
        name: conditionInfo.name,
        description,
        type: conditionInfo.type,
        intensity: normalizedIntensity,
    };
    
    // Duração é definida aqui conforme as regras do jogo.
    if (normalizedIntensity === 'Leve') {
        newAppliedState.remaining_turns = Math.floor(Math.random() * 4) + 3; // 3 a 6 turnos
    } else {
        newAppliedState.remaining_turns = null; // Condições Moderadas e Graves não são baseadas em turnos.
    }
    
    const updatedStatesForDB = [...character.states, newAppliedState];
    await characterService.syncCharacterConditions(character.id, updatedStatesForDB);

    dispatch({
        type: 'MODIFY_STATE',
        payload: {
            characterId: character.id,
            modifications: [{
                path: 'states',
                action: 'add',
                value: newAppliedState
            }],
            allAdvantageTraits
        }
    });

    const messageText = `A condição "${conditionInfo.name} (${normalizedIntensity})" foi aplicada em ${character.name} devido a: ${reason}. Efeito: ${description}`;
    const systemMessage: Message = {
        id: uuidv4(),
        sceneId: activeScene.id,
        authorId: 'system',
        authorName: 'Motor de Regras',
        type: 'event',
        text: messageText,
    };
    await chatService.saveChatMessage(systemMessage, campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [systemMessage] });

    logEvent({ type: 'system', message: `Condição aplicada a ${character.name}.`, payload: { characterId, conditionName, intensity, reason } });

    // Notifica a IA sobre a mudança de estado para que ela possa narrar as consequências.
    await gameMasterService.notifyAIOfStateChange(`[MUDANÇA DE ESTADO NO JOGO]: A condição "${conditionInfo.name} (${normalizedIntensity})" foi aplicada em ${character.name}. Efeito: ${description}`);

    // Retorna o resultado mecânico para a IA narrar.
    return {
        conditionName: conditionInfo.name,
        intensity: normalizedIntensity,
        effect: description,
    };
};
