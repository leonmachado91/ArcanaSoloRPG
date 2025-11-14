// services/gameMasterService.ts
// Este serviço é o orquestrador central para o fluxo do jogo (game loop).
// Ele recebe a ação do jogador, atualiza o estado, persiste os dados e,
// futuramente, irá interagir com a IA para gerar a resposta do mestre.

import { GameState, GameAction, createAppError, isAppError, formatErrorForDisplay } from '../types/game';
import { DiceRoll, Message } from '../types/chat';
import { logEvent } from '../store/devLogStore';
import { engineService } from './engineService';
import { Scene } from '../types/scene';
import { v4 as uuidv4 } from 'uuid';
import * as chatService from '@/services/db/chat.service';
import * as sceneService from '@/services/db/scene.service';
import * as narratorService from '@/services/ai/narratorService';
import { useGameStore } from '../store/useGameStore';
import * as characterService from '@/services/db/character.service';
import { Character, Element as ElementType } from '@/types/character';
import { OracleTableName } from '@/data/rules/oracles';
// FIX: Added import for useCatalogStore to resolve 'Cannot find name' error.
import { useCatalogStore } from '@/store/catalogStore';
import { usePromptStore } from '@/store/promptStore';
import { resolvePrompt } from '@/services/ai/promptFallbacks';

// Importa os novos handlers de ferramentas
import { handleApplyCondition } from './ai/tools/handlers/applyConditionHandler';
import { handleAddProgress } from './ai/tools/handlers/addProgressHandler';
import { handleEndTurn } from './ai/tools/handlers/endTurnHandler';
import { handleOracleQuery } from './ai/tools/handlers/oracleQueryHandler';
import { handleModifyInventory } from './ai/tools/handlers/inventoryHandler';
import { sceneMemoryOrchestrator } from '@/orchestrators/sceneMemoryOrchestrator';


/**
 * Processa a ação do jogador, orquestrando a atualização do estado,
 * a persistência e o ciclo de "pensamento" do mestre.
 * @param text O texto da ação do jogador.
 * @param isOffTopic Se a ação é uma mensagem "fora do personagem".
 * @param state O estado atual do jogo.
 * @param dispatch A função para despachar ações e atualizar o estado.
 */
const processPlayerAction = async (
    text: string,
    isOffTopic: boolean,
    state: GameState,
    dispatch: (action: GameAction) => void
): Promise<void> => {
    const context = 'gameMasterService.processPlayerAction';

    const run = async () => {
        const { campaign, playerCharacter } = state;
        const activeScene = campaign.scenes?.find(s => s.isActive);
        if (!activeScene) {
            throw createAppError('UNKNOWN_ERROR', 'Erro crítico: Nenhuma cena ativa encontrada.', null, context);
        }

        const playerMessage: Message = {
            id: uuidv4(),
            sceneId: activeScene.id,
            authorId: playerCharacter.id,
            authorName: playerCharacter.name || 'Jogador',
            author: playerCharacter,
            type: 'chat',
            text,
            isOffTopic
        };

        await chatService.saveChatMessage(playerMessage, campaign.id);

        dispatch({ type: 'ADD_MESSAGES', payload: [playerMessage] });
        logEvent({ type: 'player_action', actionText: text, isOffTopic });
        
        await new Promise(resolve => setTimeout(resolve, 300)); 
        
        dispatch({ type: 'SET_IS_THINKING', payload: true });

        const { narrationText, isOffTopic: isMasterResponseOffTopic } = await narratorService.getNarrationResponse(text, isOffTopic);
        
        if (narrationText && narrationText.trim() !== '') {
            const masterMessage: Message = {
                id: uuidv4(),
                sceneId: activeScene.id,
                authorId: 'master',
                authorName: 'Mestre',
                type: 'chat',
                text: narrationText,
                isOffTopic: isMasterResponseOffTopic,
            };
    
            await chatService.saveChatMessage(masterMessage, campaign.id);
    
            dispatch({ type: 'ADD_MESSAGES', payload: [masterMessage] });
        }
    };

    try {
        await run();
    } catch (error) {
        console.error(`[${context}] Error:`, error);
        throw error;
    } finally {
        dispatch({ type: 'SET_IS_THINKING', payload: false });
    }
};

/**
 * Inicia a primeira cena de uma nova campanha.
 * @param state O estado atual do jogo.
 * @param dispatch A função para despachar ações.
 */
const startNewGameScene = async (
    state: GameState,
    dispatch: (action: GameAction) => void
): Promise<void> => {
    const context = 'gameMasterService.startNewGameScene';
    try {
        const { prompts } = usePromptStore.getState();
        const sceneStartPrompt = resolvePrompt(prompts, 'SCENE_START_NARRATION_PROMPT', context).value;

        const firstScene = state.campaign.scenes?.find(s => s.sceneNumber === 1);
        
        if (!firstScene) {
            throw createAppError('VALIDATION_ERROR', 'Erro crítico: A cena inicial não foi encontrada no estado da campanha.', null, context);
        }

        if (!firstScene.isActive) {
            await sceneService.updateSceneData(firstScene.id, { isActive: true });
            dispatch({ type: 'UPDATE_SCENE', payload: { sceneId: firstScene.id, data: { isActive: true } } });
            firstScene.isActive = true; 
        }

        // --- INÍCIO DA LÓGICA DINÂMICA ---
        // Sorteia as cartas do Arcana dinamicamente.
        const { decks } = useCatalogStore.getState();
        const drawnCards = engineService.drawArcanaCards(decks);

        // Persiste as cartas sorteadas na cena no banco de dados.
        await sceneService.updateSceneData(firstScene.id, { arcanaCardsDrawn: drawnCards });

        // Atualiza o estado local do Zustand.
        dispatch({ type: 'UPDATE_SCENE', payload: { sceneId: firstScene.id, data: { arcanaCardsDrawn: drawnCards } } });
        
        // Atualiza a cópia local da cena para o resto desta função.
        firstScene.arcanaCardsDrawn = drawnCards;
        // --- FIM DA LÓGICA DINÂMICA ---

        const sceneTitle = firstScene.title;

        const sceneMessage: Message = {
            id: uuidv4(),
            sceneId: firstScene.id,
            authorId: 'system',
            authorName: 'Motor de Regras',
            type: 'scene_change',
            text: sceneTitle,
            cardDraw: firstScene.arcanaCardsDrawn
        };
        await chatService.saveChatMessage(sceneMessage, state.campaign.id);
        dispatch({ type: 'ADD_MESSAGES', payload: [sceneMessage] });
        
        logEvent({ type: 'system', message: `Cena 1 (${sceneTitle}) ativada e exibida.`, payload: { scene: firstScene } });

        dispatch({ type: 'SET_IS_THINKING', payload: true });

        const { narrationText, isOffTopic } = await narratorService.getNarrationResponse(sceneStartPrompt, false);
        
        if (narrationText && narrationText.trim() !== '') {
            const masterMessage: Message = {
                id: uuidv4(),
                sceneId: firstScene.id,
                authorId: 'master',
                authorName: 'Mestre',
                type: 'chat',
                text: narrationText,
                isOffTopic: isOffTopic,
            };
    
            await chatService.saveChatMessage(masterMessage, state.campaign.id);
            dispatch({ type: 'ADD_MESSAGES', payload: [masterMessage] });
        }

    } catch (error) {
        console.error(`[${context}] Error:`, error);
        throw error;
    } finally {
        dispatch({ type: 'SET_IS_THINKING', payload: false });
    }
};

/**
 * Orquestra a aplicação de uma condição a um personagem, agora delegando para o handler.
 */
const executeApplyCondition = async (
    characterId: string,
    conditionName: string,
    intensity: 'Leve' | 'Moderado' | 'Grave',
    reason: string
): Promise<{ conditionName: string; intensity: 'Leve' | 'Moderado' | 'Grave'; effect: string; }> => {
    const context = 'gameMasterService.executeApplyCondition';
    try {
        return await handleApplyCondition(characterId, conditionName, intensity, reason);
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Falha ao executar a aplicação de condição.', error, context);
    }
};

/**
 * Orquestra a adição de pontos de progresso a um personagem, agora delegando para o handler.
 */
const executeAddProgress = async (
    characterId: string,
    points: number,
    reason: string
): Promise<{ pointsAdded: number; newElementPointsAwarded: number; }> => {
    const context = 'gameMasterService.executeAddProgress';
    try {
        return await handleAddProgress(characterId, points, reason);
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Falha ao adicionar pontos de progresso.', error, context);
    }
};

/**
 * Executa o ciclo completo de fim de turno, agora delegando para o handler.
 */
const executeEndTurnCycle = async (): Promise<void> => {
    const context = 'gameMasterService.executeEndTurnCycle';
    try {
        await handleEndTurn();
    } catch (error) {
        logEvent({ type: 'system', message: `ERRO no ciclo de fim de turno`, payload: error });
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Falha ao processar o fim do turno.', error, context);
    }
};

/**
 * Executa a consulta a um oráculo, agora delegando para o handler.
 */
const executeOracleQuery = async (tableName: OracleTableName): Promise<void> => {
    const context = 'gameMasterService.executeOracleQuery';
    try {
        await handleOracleQuery(tableName);
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', `Falha ao consultar o oráculo '${tableName}'.`, error, context);
    }
};


// --- Funções que permanecem por enquanto (usadas por dev tools, etc.) ---

/**
 * Orquestra a adição de um item ao inventário de um personagem.
 * Wrapper para o handler de inventário, usado principalmente por ferramentas de dev.
 */
const executeAddItem = async (
    characterId: string,
    item: { name: string; description?: string; quantity: number }
): Promise<void> => {
    const context = 'gameMasterService.executeAddItem';
    try {
        await handleModifyInventory(
            characterId,
            'add',
            item.name,
            item.quantity,
            item.description || null,
            "Adicionado manualmente pela ferramenta de teste."
        );
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Falha ao executar a adição de item.', error, context);
    }
};

const executeSceneChange = async (): Promise<void> => {
    const context = 'gameMasterService.executeSceneChange';
    const state = useGameStore.getState();
    const { dispatch } = state;
    const { decks } = useCatalogStore.getState();

    const oldActiveScene = state.campaign.scenes?.find(s => s.isActive);
    if (oldActiveScene) {
        try {
            const loreEntry = await sceneMemoryOrchestrator.archiveScene(oldActiveScene, state);
            if (loreEntry) {
                const latestState = useGameStore.getState();
                const currentLore = latestState.campaign.lore || [];
                dispatch({ type: 'UPDATE_CAMPAIGN', payload: { lore: [...currentLore, loreEntry] } });
            }
        } catch (error) {
            const friendly = formatErrorForDisplay(error, 'Falha ao consolidar a cena anterior.');
            logEvent({
                type: 'system',
                message: 'SceneMemory falhou ao consolidar cena.',
                payload: { sceneId: oldActiveScene.id, error: friendly },
            });
        }

        await sceneService.updateSceneData(oldActiveScene.id, { isActive: false });
        dispatch({ type: 'UPDATE_SCENE', payload: { sceneId: oldActiveScene.id, data: { isActive: false } } });
    }

    const scenes = state.campaign.scenes || [];
    const newSceneNumber = scenes.length > 0 ? Math.max(...scenes.map(s => s.sceneNumber)) + 1 : 1;
    const arcanaData = engineService.drawArcanaCards(decks);

    const newScene: Scene = {
        id: uuidv4(),
        campaignId: state.campaign.id,
        sceneNumber: newSceneNumber,
        title: `Cena Forçada ${newSceneNumber}`,
        description: `Cena ${newSceneNumber} forçada pelo desenvolvedor.`,
        arcanaCardsDrawn: arcanaData,
        isActive: true,
        turnCount: 0,
        characterIds: [state.playerCharacter.id],
    };

    await sceneService.saveScene(newScene);

    const message: Message = {
        id: uuidv4(),
        sceneId: newScene.id,
        authorId: 'system',
        authorName: 'Motor de Regras',
        type: 'scene_change',
        text: newScene.title,
        cardDraw: newScene.arcanaCardsDrawn
    };

    await chatService.saveChatMessage(message, state.campaign.id);
    dispatch({ type: 'ADD_SCENE', payload: newScene });
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });

    logEvent({ type: 'system', message: 'Nova Cena Forçada', payload: { sceneNumber: newSceneNumber } });
    // FIX: Correctly reference properties from the `arcanaData` object instead of non-existent variables `theme`, `adjective`, and `emotion`.
    narratorService.updateAIContext(`Uma nova cena começou: ${newScene.title}. As cartas do arcana são ${arcanaData.verb}, ${arcanaData.theme}, ${arcanaData.adjective}, ${arcanaData.emotion}.`);
};

const executeNpcCreation = async (npcData: { name: string; description: string; history: string; }): Promise<void> => {
    const context = 'gameMasterService.executeNpcCreation';
    const state = useGameStore.getState();
    const { dispatch } = state;

    const newNpc: Omit<Character, 'progressTrack'> = {
        id: uuidv4(),
        type: 'npc',
        name: npcData.name,
        description: npcData.description,
        history: npcData.history,
        age: 30,
        personalityTraits: [],
        imageUrl: '',
        elements: { fire: 1, water: 1, air: 1, earth: 1 },
        advantages: [],
        disadvantages: [],
        progressPoints: 0,
        unspentElementPoints: 0,
        states: [],
        items: [],
    };

    await characterService.saveNewCharacter(newNpc as Character, state.campaign.id);
    dispatch({ type: 'ADD_NPC', payload: newNpc as Character });

    logEvent({ type: 'system', message: `Novo NPC '${newNpc.name}' criado e salvo.`, payload: newNpc });
};

const executeAddCharacterToScene = async (characterId: string): Promise<void> => {
    const context = 'gameMasterService.executeAddCharacterToScene';
    const state = useGameStore.getState();
    const { dispatch } = state;
    const activeScene = state.campaign.scenes?.find(s => s.isActive);

    if (!activeScene) throw createAppError('UNKNOWN_ERROR', 'Nenhuma cena ativa para adicionar personagem.', null, context);

    const characterIds = new Set<string>(activeScene.characterIds || []);
    if (characterIds.has(characterId)) return; // Already in scene

    const newCharacterIds = Array.from(characterIds.add(characterId));

    await sceneService.updateSceneData(activeScene.id, { characterIds: newCharacterIds });
    dispatch({ type: 'UPDATE_SCENE', payload: { sceneId: activeScene.id, data: { characterIds: newCharacterIds } } });

    const npc = state.npcs.find(c => c.id === characterId);
    const messageText = `${npc?.name || 'Personagem'} entra na cena.`;
    const message: Message = {
        id: uuidv4(),
        sceneId: activeScene.id,
        authorId: 'system',
        authorName: 'Motor de Regras',
        type: 'event',
        text: messageText,
    };
    await chatService.saveChatMessage(message, state.campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    logEvent({ type: 'system', message: 'Personagem Adicionado à Cena', payload: { sceneId: activeScene.id, characterId } });
    narratorService.updateAIContext(messageText);
};

const executeArcanaDraw = async (): Promise<void> => {
    const state = useGameStore.getState();
    const { dispatch } = state;
    const { decks } = useCatalogStore.getState();
    const activeScene = state.campaign.scenes?.find(s => s.isActive);
    if (!activeScene) return;

    const result = engineService.drawArcanaCards(decks);
    const message: Message = {
        id: uuidv4(),
        sceneId: activeScene.id,
        authorId: 'system',
        authorName: 'Motor de Regras',
        type: 'card_draw',
        text: 'Sorteio de Cartas Arcana',
        cardDraw: result
    };

    await chatService.saveChatMessage(message, state.campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    logEvent({ type: 'system', message: 'Sorteio de Cartas Arcana', payload: result });
    narratorService.updateAIContext(`As cartas do arcana foram sorteadas: ${result.verb}, ${result.theme}, ${result.adjective}, ${result.emotion}.`);
};

const executeImmediateDifficultyCheck = async (args: { characterId: string; element: ElementType; difficulty: number; modifier: number; description: string; }): Promise<void> => {
    const state = useGameStore.getState();
    const { dispatch } = state;
    const activeScene = state.campaign.scenes?.find(s => s.isActive);
    if (!activeScene) return;
    
    const character = [state.playerCharacter, ...state.npcs].find(c => c.id === args.characterId);
    if (!character) return;

    const numDice = character.elements[args.element] || 1;
    const result = engineService.performDifficultyCheck(numDice, args.difficulty, args.modifier);

    const diceRollData: DiceRoll = {
        type: 'difficulty_check',
        testName: `Teste de ${args.element}`,
        description: args.description,
        characterId: character.id,
        element: args.element,
        diceCount: numDice,
        difficulty: args.difficulty,
        modifiers: [{ description: 'Modificador Manual', value: args.modifier }],
        status: 'rolled',
        result: { rolls: result.rollResult.rolls, sum: result.rollResult.total, total: result.finalTotal, success: result.isSuccess },
    };

    const message: Message = { id: uuidv4(), sceneId: activeScene.id, authorId: 'system', authorName: 'Motor de Regras', type: 'dice_roll', text: 'Teste de Dificuldade', diceRoll: diceRollData };

    await chatService.saveChatMessage(message, state.campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    logEvent({ type: 'system', message: 'Teste de Dificuldade Imediato Executado', payload: { args, result } });
    narratorService.updateAIContext(`O teste '${args.description}' foi resolvido. Resultado: ${result.isSuccess ? 'SUCESSO' : 'FALHA'}.`);
};

const executeImmediateClash = async (args: { attackerId: string, defenderId: string, attackerMod: number, defenderMod: number, description: string }): Promise<void> => {
    const state = useGameStore.getState();
    const { dispatch } = state;
    const activeScene = state.campaign.scenes?.find(s => s.isActive);
    if (!activeScene) return;

    const attacker = [state.playerCharacter, ...state.npcs].find(c => c.id === args.attackerId);
    const defender = [state.playerCharacter, ...state.npcs].find(c => c.id === args.defenderId);
    if (!attacker || !defender) return;

    const result = engineService.performContestedCheck(attacker.elements.fire, defender.elements.earth, args.attackerMod, args.defenderMod);
    const diceRollData: DiceRoll = {
        type: 'combat_clash', description: args.description, characterId: attacker.id, vsCharacterId: defender.id, diceCount: attacker.elements.fire,
        status: 'rolled', outcome: result.outcome, damageSeverity: result.damageSeverity,
        modifiers: args.attackerMod !== 0 ? [{ description: 'Modificador do Atacante', value: args.attackerMod }] : [],
        defenderModifiers: args.defenderMod !== 0 ? [{ description: 'Modificador do Defensor', value: args.defenderMod }] : [],
        result: { rolls: result.attackerRoll.rolls, sum: result.attackerRoll.total, total: result.attackerFinalTotal, success: result.outcome === 'attacker_wins' },
        defenderResult: { rolls: result.defenderRoll.rolls, sum: result.defenderRoll.total, total: result.defenderFinalTotal }
    };

    const message: Message = { id: uuidv4(), sceneId: activeScene.id, authorId: 'system', authorName: 'Motor de Regras', type: 'dice_roll', text: `Resultado do combate: ${result.outcome}.`, diceRoll: diceRollData };

    await chatService.saveChatMessage(message, state.campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    logEvent({ type: 'system', message: 'Confronto Imediato Executado', payload: { args, result } });
    narratorService.updateAIContext(`O confronto '${args.description}' foi resolvido. Resultado: ${result.outcome}.`);
};

const executeSeverityCheck = async (rolls: number[]): Promise<void> => {
    const state = useGameStore.getState();
    const { dispatch } = state;
    const activeScene = state.campaign.scenes?.find(s => s.isActive);
    if (!activeScene) return;

    const result = engineService.calculateDamageSeverity(rolls);
    const messageText = `Cálculo de Severidade de Dano: "${result}" para os dados [${rolls.join(', ')}].`;
    const message: Message = { id: uuidv4(), sceneId: activeScene.id, authorId: 'system', authorName: 'Motor de Regras', type: 'event', text: messageText };

    await chatService.saveChatMessage(message, state.campaign.id);
    dispatch({ type: 'ADD_MESSAGES', payload: [message] });
    logEvent({ type: 'system', message: 'Cálculo de Severidade de Dano', payload: { rolls, result } });
    narratorService.updateAIContext(messageText);
};

const notifyAIOfStateChange = async (changeDescription: string): Promise<string> => {
    return narratorService.updateAIContext(changeDescription);
};

export const gameMasterService = {
    processPlayerAction,
    startNewGameScene,
    notifyAIOfStateChange,
    // As funções de execução de ferramenta agora são fachadas para os handlers.
    executeEndTurnCycle,
    executeApplyCondition,
    executeAddProgress,
    executeOracleQuery,
    // As funções restantes são mantidas para uso pelos dev tools.
    executeAddItem,
    executeSceneChange,
    executeNpcCreation,
    executeAddCharacterToScene,
    executeArcanaDraw,
    executeImmediateDifficultyCheck,
    executeImmediateClash,
    executeSeverityCheck,
};
