// services/ai/tools/handlers/inventoryHandler.ts
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { logEvent } from '@/store/devLogStore';
import * as characterService from '@/services/db/character.service';
import * as chatService from '@/services/db/chat.service';
import { createAppError } from '@/types/game';
import { Message } from '@/types/chat';
import { gameMasterService } from '@/services/gameMasterService';
import { findCharacter } from '@/utils/characterUtils';
import { Character } from '@/types/character';

/**
 * Orquestra a adição ou remoção de um item do inventário de um personagem.
 */
export const handleModifyInventory = async (
    characterId: string,
    action: 'add' | 'remove',
    itemName: string,
    quantity: number,
    itemDescription: string | null,
    reason: string
): Promise<{ success: boolean; message: string }> => {
    const context = 'tool.handler.modifyInventory';
    const state = useGameStore.getState();
    const { dispatch, playerCharacter, npcs, campaign } = state;
    const allCharacters = [playerCharacter, ...npcs];

    const character = findCharacter(characterId, allCharacters);
    if (!character) {
        throw createAppError('VALIDATION_ERROR', `Personagem com ID/Nome '${characterId}' não encontrado.`, null, context);
    }

    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        throw createAppError('UNKNOWN_ERROR', 'Nenhuma cena ativa para modificar o inventário.', null, context);
    }

    const updatedItems = JSON.parse(JSON.stringify(character.items)) as Character['items'];
    const itemIndex = updatedItems.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());
    let messageText = '';

    if (action === 'add') {
        if (itemIndex > -1) {
            updatedItems[itemIndex].quantity += quantity;
        } else {
            updatedItems.push({ name: itemName, quantity, description: itemDescription || undefined });
        }
        messageText = `Item "${itemName}" (x${quantity}) adicionado ao inventário de ${character.name} por: ${reason}.`;
    } else { // remove
        if (itemIndex > -1) {
            const currentQty = updatedItems[itemIndex].quantity;
            if (currentQty <= quantity) {
                updatedItems.splice(itemIndex, 1);
                 messageText = `Item "${itemName}" removido do inventário de ${character.name} por: ${reason}.`;
            } else {
                updatedItems[itemIndex].quantity -= quantity;
                 messageText = `Quantidade (x${quantity}) do item "${itemName}" removida do inventário de ${character.name} por: ${reason}.`;
            }
        } else {
            // Item not found to remove, just log and return success to AI.
            logEvent({ type: 'system', message: `[Tool Warning] Tentativa de remover o item '${itemName}' que não existe no inventário de ${character.name}.`, payload: { characterId, itemName } });
            return { success: true, message: `O item '${itemName}' não foi encontrado no inventário para ser removido.` };
        }
    }

    // Persist and update state
    await characterService.syncCharacterItems(character.id, updatedItems);

    dispatch({
        type: 'UPDATE_CHARACTER_DATA',
        payload: { characterId: character.id, data: { items: updatedItems } }
    });

    // Create system message
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
    
    logEvent({ type: 'system', message: `Inventário de ${character.name} modificado.`, payload: { characterId, action, itemName, quantity, reason } });

    // Notify AI
    await gameMasterService.notifyAIOfStateChange(`[MUDANÇA DE ESTADO NO JOGO]: ${messageText}`);

    return { success: true, message: "Inventário modificado com sucesso." };
};