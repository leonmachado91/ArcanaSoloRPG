// services/ai/tools/handlers/oracleQueryHandler.ts
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { logEvent } from '@/store/devLogStore';
import * as chatService from '@/services/db/chat.service';
import { Message } from '@/types/chat';
import { engineService } from '@/services/engineService';
import { OracleTableName } from '@/data/rules/oracles';

/**
 * Consulta uma tabela de oráculo, posta o resultado no chat e retorna o resultado para a IA.
 */
export const handleOracleQuery = async (tableName: OracleTableName): Promise<{ roll: number; result: string; } | null> => {
    const state = useGameStore.getState();
    const { dispatch } = state;
    const activeScene = state.campaign.scenes?.find(s => s.isActive);
    if (!activeScene) return null;

    const result = engineService.queryOracle(tableName);
    if (result) {
        const messageText = `Oráculo (${tableName.replace(/_/g, ' ')}): "${result.result}" (Rolagem: ${result.roll})`;
        const message: Message = {
            id: uuidv4(),
            sceneId: activeScene.id,
            authorId: 'system',
            authorName: 'Motor de Regras',
            type: 'event',
            text: messageText
        };
        await chatService.saveChatMessage(message, state.campaign.id);
        dispatch({ type: 'ADD_MESSAGES', payload: [message] });
        logEvent({ type: 'system', message: 'Consulta a Oráculo', payload: { oracle: tableName, result } });

        // Retorna o resultado mecânico para a IA narrar.
        return result;
    }
    return null;
};
