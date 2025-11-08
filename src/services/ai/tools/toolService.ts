// services/ai/tools/toolService.ts
// Este serviço atua como o "despachante" ou "roteador" para as chamadas de ferramentas da IA.
// Sua responsabilidade é receber uma `FunctionCall`, identificar a ferramenta,
// traduzir os argumentos, invocar o motor de regras (`engineService`),
// e orquestrar os efeitos colaterais (atualização de estado e persistência).

import { FunctionCall } from "@google/genai";
import { logEvent } from "@/store/devLogStore";
import { useGameStore } from "@/store/useGameStore";
import { Character, Element as ElementType } from "@/types/character";
import { engineService } from "@/services/engineService";
import { Message, DiceRoll } from "@/types/chat";
import { v4 as uuidv4 } from 'uuid';
import * as chatService from '@/services/db/chat.service';
import { OracleTableName } from "@/data/rules/oracles";
import { formatErrorForDisplay } from "@/types/game";
import { findCharacter, getAvailableCharactersMessage } from "@/utils/characterUtils";


// Importa os handlers de ferramentas individuais
import { handleApplyCondition } from './handlers/applyConditionHandler';
import { handleAddProgress } from './handlers/addProgressHandler';
import { handleEndTurn } from './handlers/endTurnHandler';
import { handleOracleQuery } from './handlers/oracleQueryHandler';
import { handleKnowledgeQuery } from './handlers/knowledgeQueryHandler';
import { handleCharacterAction } from './handlers/characterActionHandler';
import { handleModifyInventory } from "./handlers/inventoryHandler";


/**
 * Lida com a ferramenta `roll_character_difficultyCheck`.
 */
const handleDifficultyCheck = async (args: any): Promise<any> => {
    const { characterId, element, difficulty, description } = args;
    const { dispatch, campaign, playerCharacter, npcs } = useGameStore.getState();
    const allCharacters = [playerCharacter, ...npcs];

    const character = findCharacter(characterId, allCharacters);
    if (!character) {
        return { success: false, message: `Personagem '${characterId}' não encontrado. ${getAvailableCharactersMessage(allCharacters)}` };
    }

    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        return { success: false, message: "Nenhuma cena ativa encontrada." };
    }
    
    const modifier = args.modifier || 0;
    const numDice = character.elements[element as ElementType] || 1;

    if (character.type === 'player') {
        const diceRollData: DiceRoll = {
            type: 'difficulty_check',
            testName: `Teste de ${element.charAt(0).toUpperCase() + element.slice(1)}`,
            description,
            characterId: character.id,
            element: element as ElementType,
            diceCount: numDice,
            difficulty,
            modifiers: modifier !== 0 ? [{ description: 'Modificador da IA', value: modifier }] : [],
            status: 'pending',
        };

        const message: Message = {
            id: uuidv4(),
            sceneId: activeScene.id,
            authorId: 'system',
            authorName: 'Motor de Regras',
            type: 'dice_roll',
            text: `Teste de Dificuldade Pendente para ${character.name}.`,
            diceRoll: diceRollData,
        };

        await chatService.saveChatMessage(message, campaign.id);
        dispatch({ type: 'ADD_MESSAGES', payload: [message] });

        logEvent({
            type: 'system',
            message: `[Tool] Solicitação de Teste de Dificuldade para ${character.name}.`,
            payload: { args }
        });

        return { success: true, status: 'pending' };
    } 
    else {
        const result = engineService.performDifficultyCheck(numDice, difficulty, modifier);

        const diceRollData: DiceRoll = {
            type: 'difficulty_check',
            testName: `Teste de ${element.charAt(0).toUpperCase() + element.slice(1)}`,
            description,
            characterId: character.id,
            element: element as ElementType,
            diceCount: numDice,
            difficulty,
            modifiers: modifier !== 0 ? [{ description: 'Modificador da IA', value: modifier }] : [],
            status: 'rolled',
            result: {
                rolls: result.rollResult.rolls,
                sum: result.rollResult.total,
                total: result.finalTotal,
                success: result.isSuccess,
            },
        };
    
        const message: Message = {
            id: uuidv4(),
            sceneId: activeScene.id,
            authorId: 'system',
            authorName: 'Motor de Regras',
            type: 'dice_roll',
            text: `Resultado do Teste de Dificuldade: ${result.isSuccess ? 'Sucesso' : 'Falha'}.`,
            diceRoll: diceRollData,
        };
    
        await chatService.saveChatMessage(message, campaign.id);
        dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    
        logEvent({
            type: 'system',
            message: `[Tool] Teste de Dificuldade executado para ${character.name}.`,
            payload: { args, result }
        });
        
        return { success: true, isSuccess: result.isSuccess, finalTotal: result.finalTotal };
    }
};

/**
 * Lida com a ferramenta `roll_character_clash`.
 */
const handleClash = async (args: any): Promise<any> => {
    const { attackerId, defenderId, description } = args;
    const { dispatch, campaign, playerCharacter, npcs } = useGameStore.getState();
    const allCharacters = [playerCharacter, ...npcs];

    const attacker = findCharacter(attackerId, allCharacters);
    if (!attacker) {
        return { success: false, message: `Atacante '${attackerId}' não encontrado. ${getAvailableCharactersMessage(allCharacters)}` };
    }
    const defender = findCharacter(defenderId, allCharacters);
    if (!defender) {
        return { success: false, message: `Defensor '${defenderId}' não encontrado. ${getAvailableCharactersMessage(allCharacters)}` };
    }

    const activeScene = campaign.scenes?.find(s => s.isActive);
    if (!activeScene) {
        return { success: false, message: "Nenhuma cena ativa encontrada." };
    }

    const attackerDice = attacker.elements.fire;

    if (attacker.type === 'player') {
        const diceRollData: DiceRoll = {
            type: 'combat_clash',
            testName: 'Confronto de Combate',
            description,
            characterId: attacker.id,
            vsCharacterId: defender.id,
            diceCount: attackerDice,
            status: 'pending',
            modifiers: [],
            defenderModifiers: [],
        };
        
        const message: Message = {
            id: uuidv4(),
            sceneId: activeScene.id,
            authorId: 'system',
            authorName: 'Motor de Regras',
            type: 'dice_roll',
            text: `Confronto pendente: ${attacker.name} vs ${defender.name}.`,
            diceRoll: diceRollData
        };

        await chatService.saveChatMessage(message, campaign.id);
        dispatch({ type: 'ADD_MESSAGES', payload: [message] });

        logEvent({
            type: 'system',
            message: `[Tool] Solicitação de Confronto: ${attacker.name} vs ${defender.name}.`,
            payload: { args }
        });

        return { success: true, status: 'pending' };
    } 
    else {
        const defenderDice = defender.elements.earth;
        
        const result = engineService.performContestedCheck(attackerDice, defenderDice);
    
        const diceRollData: DiceRoll = {
            type: 'combat_clash',
            testName: 'Confronto de Combate',
            description,
            characterId: attacker.id,
            vsCharacterId: defender.id,
            diceCount: attackerDice,
            difficulty: result.defenderFinalTotal,
            modifiers: [],
            defenderModifiers: [],
            status: 'rolled',
            outcome: result.outcome,
            damageSeverity: result.damageSeverity,
            result: {
                rolls: result.attackerRoll.rolls,
                sum: result.attackerRoll.total,
                total: result.attackerFinalTotal,
                success: result.outcome === 'attacker_wins',
            },
            defenderResult: {
                rolls: result.defenderRoll.rolls,
                sum: result.defenderRoll.total,
                total: result.defenderFinalTotal,
            }
        };
    
        const message: Message = {
            id: uuidv4(),
            sceneId: activeScene.id,
            authorId: 'system',
            authorName: 'Motor de Regras',
            type: 'dice_roll',
            text: `Resultado do combate: ${result.outcome}.`,
            diceRoll: diceRollData,
        };
    
        await chatService.saveChatMessage(message, campaign.id);
        dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    
        logEvent({
            type: 'system',
            message: `[Tool] Confronto executado: ${attacker.name} vs ${defender.name}.`,
            payload: { args, result }
        });
        
        return {
            success: true,
            outcome: result.outcome,
            damageSeverity: result.damageSeverity,
        };
    }
};

// Funções wrapper para corresponder à assinatura (args: any) para o mapa de handlers.
const applyConditionWrapper = (args: any) => {
    const { characterId, conditionName, intensity, reason } = args;
    return handleApplyCondition(characterId, conditionName, intensity, reason);
};
const addProgressWrapper = (args: any) => {
    const { points, reason, characterId } = args;
    return handleAddProgress(characterId, points, reason);
};
const endTurnWrapper = (_args: any) => handleEndTurn();
const oracleQueryWrapper = (args: any) => handleOracleQuery(args.tableName as OracleTableName);
const knowledgeQueryWrapper = (args: any) => handleKnowledgeQuery(args.queryText, args.searchDomain);
const characterActionWrapper = (args: any) => {
    const { characterId, actionText } = args;
    return handleCharacterAction(characterId, actionText);
};
const inventoryWrapper = (args: any) => {
    const { characterId, action, itemName, quantity, itemDescription, reason } = args;
    return handleModifyInventory(characterId, action, itemName, quantity, itemDescription, reason);
};


// Mapa de handlers para um despacho dinâmico e extensível.
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
    'roll_character_difficultyCheck': handleDifficultyCheck,
    'roll_character_clash': handleClash,
    'modify_character_applyCondition': applyConditionWrapper,
    'modify_character_addProgress': addProgressWrapper,
    'query_game_oracle': oracleQueryWrapper,
    'modify_scene_endTurn': endTurnWrapper,
    'query_knowledgeBase': knowledgeQueryWrapper,
    'character_action': characterActionWrapper,
    'modify_character_inventory': inventoryWrapper,
};

/**
 * Processa uma `FunctionCall` vinda da IA, roteando para a implementação correta.
 * @param functionCall O objeto de chamada de ferramenta retornado pela API Gemini.
 * @returns Uma promessa que resolve com o resultado mecânico da ferramenta.
 */
const dispatchTool = async (functionCall: FunctionCall): Promise<any> => {
    const { name, args } = functionCall;

    logEvent({
        type: 'system',
        message: `[Tool Dispatcher] IA solicitou a ferramenta: ${name}`,
        payload: { args }
    });

    const handler = toolHandlers[name];

    if (handler) {
        try {
            return await handler(args);
        } catch (error) {
            const message = formatErrorForDisplay(error, `Erro interno ao executar a ferramenta '${name}'.`);
            console.error(`[Tool Service] Erro ao executar a ferramenta '${name}':`, error);
            logEvent({
                type: 'system',
                message: `[Tool Dispatcher] ERRO ao executar a ferramenta: ${name}`,
                payload: { error }
            });
            return { success: false, message };
        }
    } else {
        console.warn(`[Tool Service] Tentativa de chamar uma ferramenta desconhecida: ${name}`);
        return {
            success: false,
            message: `Ferramenta desconhecida: ${name}`,
        };
    }
};

export const toolService = {
    dispatchTool,
};