// services/ai/tools/handlers/endTurnHandler.ts
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { useCatalogStore } from '@/store/catalogStore';
import { logEvent } from '@/store/devLogStore';
import * as characterService from '@/services/db/character.service';
import * as sceneService from '@/services/db/scene.service';
import * as chatService from '@/services/db/chat.service';
import { createAppError } from '@/types/game';
import { Message } from '@/types/chat';
import { engineService } from '@/services/engineService';
import { gameMasterService } from '@/services/gameMasterService';

/**
 * Executa o ciclo completo de fim de turno, atualizando condições e avançando o contador.
 */
export const handleEndTurn = async (): Promise<{ newTurn: number; expiredConditions: string }> => {
    const context = 'tool.handler.endTurn';
    const state = useGameStore.getState();
    const { dispatch } = state;
    const { campaign, playerCharacter, npcs } = state;
    const { traits } = useCatalogStore.getState();
    const allAdvantageTraits = traits.filter(trait => trait.type === 'advantage');
    
    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        throw createAppError('UNKNOWN_ERROR', 'Nenhuma cena ativa para avançar o turno.', null, context);
    }
    
    logEvent({ type: 'system', message: 'Iniciando ciclo de fim de turno...' });

    const allChars = [playerCharacter, ...npcs];
    const characterStates = allChars.map(c => ({ id: c.id, states: c.states }));
    
    const updatedCharacters = engineService.processTurnEnd(characterStates);
    const newTurnCount = (activeScene.turnCount || 0) + 1;
    
    await Promise.all([
        ...updatedCharacters.map(updatedChar => 
            characterService.syncCharacterConditions(updatedChar.id, updatedChar.states)
        ),
        sceneService.updateSceneData(activeScene.id, { turnCount: newTurnCount })
    ]);

    updatedCharacters.forEach(updatedChar => {
        dispatch({
            type: 'MODIFY_STATE',
            payload: {
                characterId: updatedChar.id,
                modifications: [{ path: 'states', action: 'set', value: updatedChar.states }],
                allAdvantageTraits
            }
        });
    });
    dispatch({ type: 'UPDATE_SCENE', payload: { sceneId: activeScene.id, data: { turnCount: newTurnCount } } });

    const message: Message = {
        id: uuidv4(),
        sceneId: activeScene.id,
        authorId: 'system',
        authorName: 'Motor de Regras',
        type: 'event',
        text: `--- Turno ${newTurnCount} ---`,
    };
    await chatService.saveChatMessage(message, campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });

    logEvent({
        type: 'system',
        message: `Fim de Turno executado (-> Turno ${newTurnCount})`,
        payload: { newTurn: newTurnCount, updatedCharacters }
    });
    
    let expiredConditionsMessage = '';
    if (updatedCharacters.length > 0) {
        const notificationParts: string[] = [];
        for (const updatedChar of updatedCharacters) {
            const originalChar = allChars.find(c => c.id === updatedChar.id);
            if (!originalChar) continue;

            const originalStateNames = new Set((originalChar.states || []).filter(s => s && s.name).map(s => s.name));
            const newStateNames = new Set((updatedChar.states || []).filter(s => s && s.name).map(s => s.name));
            
            const expiredStates = [...originalStateNames].filter(name => typeof name === 'string' && !newStateNames.has(name));

            if (expiredStates.length > 0) {
                notificationParts.push(`Para ${originalChar.name}, a(s) condição(ões) '${expiredStates.join("', '")}' expiraram.`);
            }
        }
        if (notificationParts.length > 0) {
            expiredConditionsMessage = "O tempo avança. " + notificationParts.join(' ');
        }
    }
    
    // Notifica a IA sobre a mudança de estado.
    await gameMasterService.notifyAIOfStateChange(`[MUDANÇA DE ESTADO NO JOGO]: O turno avançou para ${newTurnCount}. ${expiredConditionsMessage}`);

    // Retorna o resultado mecânico para a IA.
    return {
        newTurn: newTurnCount,
        expiredConditions: expiredConditionsMessage || 'Nenhuma condição expirou.',
    };
};
