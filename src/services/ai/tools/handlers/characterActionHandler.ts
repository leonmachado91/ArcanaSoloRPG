// services/ai/tools/handlers/characterActionHandler.ts
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { logEvent } from '@/store/devLogStore';
import * as chatService from '@/services/db/chat.service';
import { createAppError } from '@/types/game';
import { Message } from '@/types/chat';
import { findCharacter } from '@/utils/characterUtils';

/**
 * Orquestra uma ação ou diálogo de um NPC, criando uma mensagem de chat com a autoria correta.
 */
export const handleCharacterAction = async (
    characterId: string,
    actionText: string
): Promise<{ success: boolean; message: string; }> => {
    const context = 'tool.handler.characterAction';
    const state = useGameStore.getState();
    const { dispatch, playerCharacter, npcs } = state;
    const { campaign } = state;
    const allCharacters = [playerCharacter, ...npcs];

    const character = findCharacter(characterId, allCharacters);
    if (!character) {
        const errorMsg = `Personagem com ID/Nome '${characterId}' não foi encontrado para a ação.`;
        logEvent({ type: 'system', message: `[Tool Error] ${errorMsg}`, payload: { characterId } });
        // Don't throw, return a message to the AI so it can self-correct.
        return { success: false, message: errorMsg };
    }
    
    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        throw createAppError('UNKNOWN_ERROR', 'Nenhuma cena ativa para a ação do personagem.', null, context);
    }

    const newMessage: Message = {
        id: uuidv4(),
        sceneId: activeScene.id,
        authorId: character.id,
        authorName: character.name,
        author: character,
        authorImageUrl: character.imageUrl,
        type: 'chat',
        text: actionText,
        isOffTopic: false, // Character actions are always in-character
    };

    // 1. Persist the message to the database
    await chatService.saveChatMessage(newMessage, campaign.id);

    // 2. Update the local state
    dispatch({ type: 'ADD_MESSAGES', payload: [newMessage] });

    logEvent({ type: 'system', message: `[Tool] Ação/Diálogo executado por ${character.name}.`, payload: { characterId, actionText } });
    
    // 3. Return a simple confirmation to the AI
    // The AI does not need to narrate this, as the action itself is the narration.
    return { success: true, message: "Ação do personagem executada e exibida no chat." };
};