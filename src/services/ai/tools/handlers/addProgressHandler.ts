// services/ai/tools/handlers/addProgressHandler.ts
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { useCatalogStore } from '@/store/catalogStore';
import { logEvent } from '@/store/devLogStore';
import * as characterService from '@/services/db/character.service';
import * as chatService from '@/services/db/chat.service';
import { createAppError, StateModificationPayload } from '@/types/game';
import { Message } from '@/types/chat';
import { engineService } from '@/services/engineService';
import { gameMasterService } from '@/services/gameMasterService';
import { findCharacter } from '@/utils/characterUtils';

/**
 * Orquestra a adição de pontos de progresso a um personagem.
 */
export const handleAddProgress = async (
    characterId: string | null,
    points: number,
    reason: string
): Promise<{ pointsAdded: number; newElementPointsAwarded: number; }> => {
    const context = 'tool.handler.addProgress';
    const state = useGameStore.getState();
    const { dispatch, playerCharacter, npcs } = state;
    const { campaign } = state;
    const allCharacters = [playerCharacter, ...npcs];
    const { traits } = useCatalogStore.getState();
    const allAdvantageTraits = traits.filter(trait => trait.type === 'advantage');

    // Se o characterId não for fornecido, o padrão é o personagem do jogador.
    const targetCharacterId = characterId || state.playerCharacter.id;

    const character = findCharacter(targetCharacterId, allCharacters);
    if (!character) {
        throw createAppError('VALIDATION_ERROR', `Personagem com ID/Nome '${targetCharacterId}' não encontrado.`, null, context);
    }

    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        throw createAppError('UNKNOWN_ERROR', 'Nenhuma cena ativa para adicionar progresso.', null, context);
    }
    
    const result = engineService.addProgressPoints(character.progressPoints, points);
    
    await characterService.updateCharacterData(character.id, { 
        progressPoints: result.newTotalProgressPoints,
        unspentElementPoints: character.unspentElementPoints + result.newElementPointsAwarded,
    });
    
    const modifications: StateModificationPayload[] = [
        { path: 'progressPoints', action: 'set', value: result.newTotalProgressPoints }
    ];
    if (result.newElementPointsAwarded > 0) {
        modifications.push({ path: 'unspentElementPoints', action: 'add', value: result.newElementPointsAwarded });
    }

    dispatch({
        type: 'MODIFY_STATE',
        payload: {
            characterId: character.id,
            modifications,
            allAdvantageTraits
        }
    });

    let rewardText = result.newElementPointsAwarded > 0 ? ` ${result.newElementPointsAwarded} ponto(s) de elemento recompensado(s)!` : '';
    const messageText = `${character.name} ganhou ${points} ponto(s) de progresso por: ${reason}.${rewardText}`;
    
    const message: Message = {
        id: uuidv4(), sceneId: activeScene.id, authorId: 'system', authorName: 'Motor de Regras',
        type: 'event', text: messageText
    };
    await chatService.saveChatMessage(message, campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });

    logEvent({ type: 'system', message: `Pontos de progresso adicionados a ${character.name}.`, payload: { characterId: character.id, points, reason } });
    
    // Notifica a IA sobre a mudança de estado.
    await gameMasterService.notifyAIOfStateChange(`[MUDANÇA DE ESTADO NO JOGO]: ${character.name} ganhou ${points} ponto(s) de progresso.${rewardText}`);

    // Retorna o resultado mecânico para a IA narrar.
    return {
        pointsAdded: points,
        newElementPointsAwarded: result.newElementPointsAwarded,
    };
};
