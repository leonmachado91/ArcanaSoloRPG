// services/ai/narratorService.ts

// Este serviÃ§o Ã© a ponte entre o estado do jogo e a IA Mestre Narradora.

// ApÃ³s a refatoraÃ§Ã£o, ele gerencia uma sessÃ£o de chat STATEFUL com a IA,

// mantendo a memÃ³ria de curto prazo e o contexto da conversa.



import { GoogleGenAI, Chat, Content, FunctionResponsePart, Part } from "@google/genai";

import { GameState, createAppError, isAppError } from "@/types/game";

import { Message } from "@/types/chat";

import { useSettingsStore } from "@/store/settingsStore";

import { logEvent } from "@/store/devLogStore";

import { calculateCost, calculateTokens } from "@/utils/aiUtils";

import { getConfig } from "../configService";

import { allToolDeclarations } from "./tools/toolDefinitions";

import { toolService } from "./tools/toolService";

import { useCatalogStore } from "@/store/catalogStore";

import { useRawChatStore } from "@/store/useRawChatStore";

import { usePromptStore } from "@/store/promptStore";
import { resolvePrompt } from "./promptFallbacks";





// --- VariÃ¡veis de Escopo do MÃ³dulo ---



const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {

  throw new Error("VITE_GEMINI_API_KEY nÃ£o encontrada. Verifique seu arquivo .env.local.");

}

const ai = new GoogleGenAI({ apiKey });



/** A sessÃ£o de chat ativa com a IA Mestre. Ã nula atÃ© ser inicializada. */

let chatSession: Chat | null = null;

/** Armazena o modelo usado na sessÃ£o para fins de logging. */

let activeModel: string = '';



const API_TIMEOUT_MS = 60000; // 60 segundos
const MAX_GEMINI_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;
const RETRYABLE_STATUS_CODES = new Set([500, 503]);
const RETRYABLE_STATUS_TEXT = new Set(['INTERNAL', 'UNAVAILABLE']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractTextFromContent = (content?: Content | null): string => {
    if (!content?.parts) return '';
    return content.parts
        .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
        .filter((text) => text && text.trim().length > 0)
        .join('\n')
        .trim();
};

type GeminiApiErrorShape = {
    code?: number;
    status?: string;
    statusCode?: number;
    message?: string;
    error?: GeminiApiErrorShape;
};

const getGeminiErrorDetails = (error: unknown) => {
    if (!error || typeof error !== 'object') {
        return { code: null as number | null, status: null as string | null, message: typeof error === 'string' ? error : '' };
    }
    const payload = error as GeminiApiErrorShape;
    const nested = payload.error ?? {};
    const codeCandidate = payload.code ?? payload.statusCode ?? nested.code ?? nested.statusCode;
    const statusCandidate = payload.status ?? nested.status;
    const messageCandidate = payload.message ?? nested.message ?? '';
    const numericCode = typeof codeCandidate === 'number' ? codeCandidate : Number(codeCandidate ?? NaN);
    return {
        code: Number.isFinite(numericCode) ? numericCode : null,
        status: statusCandidate ?? null,
        message: messageCandidate,
    };
};

const shouldRetryGeminiError = (error: unknown): boolean => {
    const { code, status, message } = getGeminiErrorDetails(error);
    if (code && RETRYABLE_STATUS_CODES.has(code)) return true;
    if (typeof status === 'string' && RETRYABLE_STATUS_TEXT.has(status.toUpperCase())) return true;
    const normalizedMessage = (message || '').toLowerCase();
    return (
        normalizedMessage.includes('internal error') ||
        normalizedMessage.includes('backend error') ||
        normalizedMessage.includes('temporarily unavailable')
    );
};

const callGeminiWithRetry = async <T>(operation: () => Promise<T>, stageLabel: string): Promise<T> => {
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < MAX_GEMINI_ATTEMPTS) {
        attempt += 1;
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!shouldRetryGeminiError(error) || attempt >= MAX_GEMINI_ATTEMPTS) {
                break;
            }
            const delay = RETRY_BASE_DELAY_MS * attempt;
            console.warn(
                `[narratorService] Falha ao ${stageLabel} (tentativa ${attempt}/${MAX_GEMINI_ATTEMPTS}). Repetindo em ${delay}ms.`,
                error
            );
            await sleep(delay);
        }
    }
    throw lastError ?? new Error(`Falha ao ${stageLabel}`);
};

const buildSceneDiariesBlock = (state: GameState): { text: string; count: number } | null => {
    const loreEntries = state.campaign.lore || [];
    const diaryEntries = loreEntries.filter(entry => entry.category?.startsWith('scene_diary:'));
    if (diaryEntries.length === 0) return null;

    const scenesById = new Map((state.campaign.scenes || []).map(scene => [scene.id, scene]));
    const ordered = diaryEntries.slice().sort((a, b) => {
        const sceneIdA = a.category.split(':')[1];
        const sceneIdB = b.category.split(':')[1];
        const sceneA = scenesById.get(sceneIdA);
        const sceneB = scenesById.get(sceneIdB);
        const numA = sceneA?.sceneNumber ?? Number.MAX_SAFE_INTEGER;
        const numB = sceneB?.sceneNumber ?? Number.MAX_SAFE_INTEGER;
        return numA - numB;
    });

    const block = ordered
        .map(entry => entry.content.trim())
        .filter(Boolean)
        .join('\n\n---\n\n')
        .trim();

    if (!block) return null;
    const text = `# Diário Completo da Campanha\n${block}`;
    return { text, count: ordered.length };
};


// --- Helper Functions ---

/**

 * Formata uma mensagem de qualquer tipo em uma string de texto simples

 * para ser usada no histÃ³rico de hidrataÃ§Ã£o da IA, garantindo que o contexto

 * mecÃ¢nico e de eventos seja preservado.

 * @param message O objeto da mensagem a ser formatado.

 * @returns Uma string representando a mensagem, ou nulo se a mensagem for irrelevante.

 */

const formatMessageForAIHistory = (message: Message): string | null => {

    const context = 'narratorService.formatMessageForAIHistory';

    if (!message.type || (!message.text?.trim() && message.type !== 'dice_roll')) {

        return null;

    }

    

    const { prompts } = usePromptStore.getState();
    const tags = {
        TIME_CONTEXT_TAG: resolvePrompt(prompts, 'TIME_CONTEXT_TAG', context).value,
        EVENT_CONTEXT_TAG: resolvePrompt(prompts, 'EVENT_CONTEXT_TAG', context).value,
        NEW_SCENE_CONTEXT_TAG_WITH_CARDS: resolvePrompt(prompts, 'NEW_SCENE_CONTEXT_TAG_WITH_CARDS', context).value,
        NEW_SCENE_CONTEXT_TAG: resolvePrompt(prompts, 'NEW_SCENE_CONTEXT_TAG', context).value,
        COMBAT_CONTEXT_TAG: resolvePrompt(prompts, 'COMBAT_CONTEXT_TAG', context).value,
        TEST_CONTEXT_TAG: resolvePrompt(prompts, 'TEST_CONTEXT_TAG', context).value,
        PENDING_TEST_CONTEXT_TAG: resolvePrompt(prompts, 'PENDING_TEST_CONTEXT_TAG', context).value,
    };

    let formattedText: string | null = null;



    switch (message.type) {

        case 'chat':

            formattedText = message.text;

            break;

        case 'event':

            if (message.text.toLowerCase().startsWith('--- turno')) {

                 formattedText = tags.TIME_CONTEXT_TAG!.replace('{text}', message.text);

            } else {

                formattedText = tags.EVENT_CONTEXT_TAG!.replace('{text}', message.text);

            }

            break;

        case 'scene_change':

            if (message.cardDraw) {

                const { verb, theme, adjective, emotion } = message.cardDraw;

                formattedText = tags.NEW_SCENE_CONTEXT_TAG_WITH_CARDS!

                    .replace('{text}', message.text)

                    .replace('{cards}', `${verb}, ${theme}, ${adjective}, ${emotion}`);

            } else {

                formattedText = tags.NEW_SCENE_CONTEXT_TAG!.replace('{text}', message.text);

            }

            break;

        case 'dice_roll':

            if (message.diceRoll) {

                const { testName, description, status, result, outcome, difficulty, type: rollType } = message.diceRoll;

                const title = testName || description;



                if (status === 'rolled') {

                    if (rollType === 'combat_clash') {

                         const outcomeStr = outcome === 'attacker_wins' ? 'Atacante venceu' : outcome === 'defender_wins' ? 'Defensor venceu' : 'Empate';

                         formattedText = tags.COMBAT_CONTEXT_TAG!

                            .replace('{title}', title)

                            .replace('{outcome}', outcomeStr)

                            .replace('{attackerTotal}', (result?.total ?? 0).toString())

                            .replace('{defenderTotal}', (message.diceRoll.defenderResult?.total ?? 0).toString());

                    } else {

                        const successStr = result?.success ? 'SUCESSO' : 'FALHA';

                        formattedText = tags.TEST_CONTEXT_TAG!

                            .replace('{title}', title)

                            .replace('{outcome}', successStr)

                            .replace('{total}', (result?.total ?? 0).toString())

                            .replace('{difficulty}', (difficulty ?? 0).toString());

                    }

                } else {

                    formattedText = tags.PENDING_TEST_CONTEXT_TAG!.replace('{title}', title);

                }

            } else {

                formattedText = null;

            }

            break;

        default:

            formattedText = null;

    }

    

    if (formattedText && message.isOffTopic) {

        return `[OFF-TOPIC]: ${formattedText}`;

    }



    return formattedText;

};



/**

 * Gera um resumo em Markdown do estado atual do jogo para a IA.

 */

const _generateGameStateSummary = (state: GameState): string => {

    const { campaign, playerCharacter, npcs } = state;

    const activeScene = campaign.scenes?.find(s => s.isActive);



    if (!activeScene) {

        return "## ERRO: Nenhuma cena ativa encontrada.";

    }



    const summaryParts: string[] = [];



    summaryParts.push(`## Cena Atual: "${activeScene.title}"`);

    summaryParts.push(activeScene.description);

    if (activeScene.arcanaCardsDrawn) {

        const { verb, theme, adjective, emotion } = activeScene.arcanaCardsDrawn;

        summaryParts.push(`\n**Tema da Cena (Cartas):** ${verb}, ${theme}, ${adjective}, ${emotion}`);

    }

     summaryParts.push(`**Turno Atual:** ${activeScene.turnCount || 0}`);



    summaryParts.push(`\n## Personagem do Jogador`);

    summaryParts.push(`- **Nome:** ${playerCharacter.name} (ID: \`${playerCharacter.id}\`)`);

    summaryParts.push(`- **Objetivo:** ${playerCharacter.objective || 'NÃ£o definido'}`);

    summaryParts.push(`- **Segredo:** ${playerCharacter.secret || 'Nenhum'}`);

    

    const playerConditions = playerCharacter.states?.filter(s => s && s.name);

    if (playerConditions && playerConditions.length > 0) {

        summaryParts.push(`- **CondiÃ§Ãµes Ativas:** ${playerConditions.map(c => `${c.name} (${c.intensity})`).join(', ')}`);

    } else {

        summaryParts.push(`- **CondiÃ§Ãµes Ativas:** Nenhuma`);

    }



    const characterIdsInScene = new Set(activeScene.characterIds || []);

    const npcsInScene = npcs.filter(npc => characterIdsInScene.has(npc.id));



    if (npcsInScene.length > 0) {

        summaryParts.push(`\n## Outros Personagens na Cena`);

        npcsInScene.forEach(npc => {

            summaryParts.push(`- **Nome:** ${npc.name} (ID: \`${npc.id}\`, Tipo: ${npc.type})`);

            const npcConditions = npc.states?.filter(s => s && s.name);

            if (npcConditions && npcConditions.length > 0) {

                summaryParts.push(`  - **CondiÃ§Ãµes Ativas:** ${npcConditions.map(c => `${c.name} (${c.intensity})`).join(', ')}`);

            } else {

                 summaryParts.push(`  - **CondiÃ§Ãµes Ativas:** Nenhuma`);

            }

        });

    }



    return summaryParts.join('\n');

};



/**

 * FunÃ§Ã£o "core" que envia uma mensagem para a IA e gerencia o ciclo de resposta completo.

 */

const _sendMessageAndHandleResponse = async (

    messageToSend: string,

): Promise<{ narrationText: string; isOffTopic: boolean }> => {

    const startTime = Date.now();

    const context = 'narratorService._sendMessageAndHandleResponse';

    

    if (!chatSession) {

        throw createAppError('UNKNOWN_ERROR', 'A sessÃ£o de chat com a IA Mestre nÃ£o foi inicializada.', null, context);

    }



    try {

        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('API_TIMEOUT')), API_TIMEOUT_MS));



        const rawChatStore = useRawChatStore.getState();

        const userTurn: Content = { role: 'user', parts: [{ text: messageToSend }] };

        rawChatStore.setHistory([...rawChatStore.history, userTurn]);



        const apiCallPromise = callGeminiWithRetry(
            () => chatSession!.sendMessage({ message: messageToSend }),
            'enviar a a��o do jogador para a IA'
        );

        const response = await Promise.race([apiCallPromise, timeoutPromise]);

        // Extrai a narra��o de texto imediatamente, pois ela pode coexistir com as chamadas de ferramentas.

        const primaryCandidate = response.candidates?.[0];

        const rawNarrationText = extractTextFromContent(primaryCandidate?.content) || response.text?.trim() || '';

        const offTopicPrefix = '[OFF-TOPIC]:';

        const isOffTopic = rawNarrationText.startsWith(offTopicPrefix);

        const narrationText = isOffTopic ? rawNarrationText.substring(offTopicPrefix.length).trim() : rawNarrationText;



        if (response.candidates && response.candidates.length > 0) {

            const modelTurn1 = response.candidates[0].content;

            const currentHistory = useRawChatStore.getState().history;

            useRawChatStore.getState().setHistory([...currentHistory, modelTurn1]);

        }



        const functionCalls = response.functionCalls;

        if (functionCalls && functionCalls.length > 0) {

            const toolCallResultsLog = [];

            const functionResponses: Part[] = [];

            

            let hasPendingAction = false;

            for (const functionCall of functionCalls) {

                const toolResult = await toolService.dispatchTool(functionCall);

                

                if (toolResult?.status === 'pending') hasPendingAction = true;

                

                toolCallResultsLog.push({ name: functionCall.name, args: functionCall.args, result: toolResult });

                functionResponses.push({ functionResponse: { name: functionCall.name, response: { result: toolResult } } });

            }



            // Se for uma aÃ§Ã£o de personagem ou uma aÃ§Ã£o pendente, nÃ£o hÃ¡ um segundo turno para a IA.

            // A narraÃ§Ã£o (se houver) jÃ¡ foi extraÃ­da. As ferramentas jÃ¡ postaram suas prÃ³prias mensagens no chat.

            if (hasPendingAction || functionCalls.some(fc => fc.name === 'character_action')) {

                logEvent({

                    type: 'ai', requestPrompt: messageToSend, systemInstruction: "Stateful Chat Session (Tool Call & Text)",

                    rawResponse: `[Narration: ${narrationText}] & [Function Calls: ${JSON.stringify(functionCalls)}]`,

                    inputTokens: calculateTokens(messageToSend), outputTokens: calculateTokens(narrationText) + calculateTokens(JSON.stringify(functionCalls)),

                    estimatedCost: calculateCost(calculateTokens(messageToSend), calculateTokens(narrationText) + calculateTokens(JSON.stringify(functionCalls)), activeModel),

                    modelUsed: activeModel, taskType: 'gameMaster', responseTimeMs: Date.now() - startTime, toolCalls: toolCallResultsLog,

                });

                return { narrationText, isOffTopic };

            }

            

            // Para outras ferramentas, envie o resultado de volta para a IA para que ela possa narrar.

            const functionResponseTurn: Content = { role: 'user', parts: functionResponses };

            const currentHistory = useRawChatStore.getState().history;

            useRawChatStore.getState().setHistory([...currentHistory, functionResponseTurn]);

            

            const finalResponsePromise = callGeminiWithRetry(
                () => chatSession!.sendMessage({ message: functionResponses }),
                'enviar os resultados das ferramentas de volta para a IA'
            );

            const finalResponse = await Promise.race([finalResponsePromise, timeoutPromise]);

            

            if (finalResponse.candidates && finalResponse.candidates.length > 0) {

                const modelTurn2 = finalResponse.candidates[0].content;

                const currentHistory2 = useRawChatStore.getState().history;

                useRawChatStore.getState().setHistory([...currentHistory2, modelTurn2]);

            }



            const finalCandidate = finalResponse?.candidates?.[0];

            if (!finalCandidate || (finalCandidate.finishReason !== 'STOP' && finalCandidate.finishReason !== 'MAX_TOKENS')) {

                 const reason = finalCandidate?.finishReason || 'Desconhecido';

                 const message = `A IA nÃ£o conseguiu narrar o resultado da ferramenta. Motivo: ${reason}.`;

                 throw createAppError('GEMINI_API_ERROR', message, { finishReason: reason }, context);

            }



            const rawFinalNarration = extractTextFromContent(finalCandidate?.content) || finalResponse.text?.trim() || '';

            const finalIsOffTopic = rawFinalNarration.startsWith(offTopicPrefix);

            const finalNarrationText = finalIsOffTopic ? rawFinalNarration.substring(offTopicPrefix.length).trim() : rawFinalNarration;



            logEvent({

                type: 'ai', requestPrompt: messageToSend, systemInstruction: "Stateful Chat Session (Tool Call Loop)",

                rawResponse: `[Function Calls: ${JSON.stringify(functionCalls)}] -> [Tool Results: ${JSON.stringify(functionResponses)}] -> [Final Narration: ${rawFinalNarration}]`,

                inputTokens: calculateTokens(messageToSend) + calculateTokens(JSON.stringify(functionResponses)),

                outputTokens: calculateTokens(JSON.stringify(functionCalls)) + calculateTokens(rawFinalNarration),

                estimatedCost: calculateCost(calculateTokens(messageToSend) + calculateTokens(JSON.stringify(functionResponses)), calculateTokens(JSON.stringify(functionCalls)) + calculateTokens(rawFinalNarration), activeModel),

                modelUsed: activeModel, taskType: 'gameMaster', responseTimeMs: Date.now() - startTime, toolCalls: toolCallResultsLog,

            });



            return { narrationText: finalNarrationText, isOffTopic: finalIsOffTopic };

        } else {

            const candidate = response?.candidates?.[0];

            if (!candidate || (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS')) {

                 const reason = candidate?.finishReason || 'Desconhecido';

                 const message = reason === 'SAFETY' ? 'A IA se recusou a gerar o conteÃºdo por seguranÃ§a.' : `A narraÃ§Ã£o foi interrompida: ${reason}.`;

                 throw createAppError('GEMINI_API_ERROR', message, { finishReason: reason }, context);

            }

            

            if (rawNarrationText === null || rawNarrationText === undefined) {

                 return { narrationText: '', isOffTopic: false };

            }

            

            const endTime = Date.now();

            logEvent({

                type: 'ai', requestPrompt: messageToSend, systemInstruction: "Stateful Chat Session",

                rawResponse: rawNarrationText, inputTokens: calculateTokens(messageToSend), outputTokens: calculateTokens(rawNarrationText),

                estimatedCost: calculateCost(calculateTokens(messageToSend), calculateTokens(rawNarrationText), activeModel),

                modelUsed: activeModel, taskType: 'gameMaster', responseTimeMs: endTime - startTime,

            });

            

            return { narrationText, isOffTopic };

        }

    } catch (error: any) {

        if (isAppError(error)) throw error;

        if (error.message === 'API_TIMEOUT') {

            throw createAppError('GEMINI_API_ERROR', 'A IA Mestre demorou muito para responder. Tente novamente.', null, context);

        }

        const friendlyMessage = "Falha ao se comunicar com a IA Mestre. A narraÃ§Ã£o nÃ£o pÃ´de ser gerada.";

        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);

    }

};



/**

 * Inicializa uma nova sessÃ£o de chat stateful com a IA Mestre.

 */

export const initializeChatSession = async (gameState: GameState): Promise<void> => {

    const context = 'narratorService.initializeChatSession';

    activeModel = useSettingsStore.getState().aiModels.gameMaster;

    const temperature = getConfig().ai.temperature;

    const { prompts } = usePromptStore.getState();
    const baseSystemInstruction = resolvePrompt(prompts, 'NARRATOR_SYSTEM_INSTRUCTION', context).value;
    const sessionStartTag = resolvePrompt(prompts, 'SESSION_START_CONTEXT_TAG', context).value;



    const { conditions } = useCatalogStore.getState();

    const conditionNames = conditions.length > 0 ? conditions.map(c => `'${c.name}'`).join(', ') : 'Nenhuma condiÃ§Ã£o carregada.';

    const rulesCatalog = `### CatÃ¡logo de Regras do Jogo (Use estes nomes EXATOS ao aplicar condiÃ§Ãµes):\n- CondiÃ§Ãµes VÃ¡lidas: ${conditionNames}.`;

    const systemInstruction = baseSystemInstruction.replace('{rulesCatalog}', rulesCatalog);



    logEvent({ type: 'system', message: `Iniciando sessÃ£o de chat com o modelo ${activeModel}.` });



    try {

        const summary = _generateGameStateSummary(gameState);

        const contextText = sessionStartTag.replace('{summary}', summary);
        const contextMessage: Content = { role: 'user', parts: [{ text: contextText }] };

        const diaryBlock = buildSceneDiariesBlock(gameState);
        let diaryContent: Content | null = null;
        if (diaryBlock) {
            diaryContent = { role: 'user', parts: [{ text: diaryBlock.text }] };
            logEvent({
                type: 'system',
                message: 'SceneMemory: Diário anexado ao contexto do Mestre.',
                payload: { entries: diaryBlock.count },
            });
        }

        const recentHistory = gameState.campaign.chatHistory.slice(-10);

        const mappedHistory: Content[] = recentHistory

            .map((msg): Content | null => {

                const role = (msg.authorId === 'master' || msg.authorId === 'system') ? 'model' : 'user';

                const text = formatMessageForAIHistory(msg);

                if (text && text.trim() !== '') return { role, parts: [{ text }] };

                return null;

            })

            .filter((item): item is Content => item !== null);

        

        const initialHistory: Content[] = diaryContent
            ? [contextMessage, diaryContent, ...mappedHistory]
            : [contextMessage, ...mappedHistory];

        

        chatSession = ai.chats.create({

            model: activeModel,

            config: { systemInstruction, temperature, tools: [{ functionDeclarations: allToolDeclarations }] },

            history: initialHistory,

        });



        useRawChatStore.getState().setSystemInstruction(systemInstruction);

        useRawChatStore.getState().setHistory(initialHistory);



        logEvent({ type: 'system', message: 'SessÃ£o de chat da IA Mestre inicializada com sucesso.', payload: { historyLength: initialHistory.length, model: activeModel } });



    } catch (error) {

        chatSession = null;

        useRawChatStore.getState().clearChat();

        const friendlyMessage = "Falha ao inicializar a memÃ³ria da IA Mestre.";

        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);

    }

};



/**

 * Envia a aÃ§Ã£o do jogador para a sessÃ£o de chat e obtÃ©m a narraÃ§Ã£o da IA.

 */

export const getNarrationResponse = async (

    playerAction: string, 

    isOffTopic: boolean

): Promise<{ narrationText: string; isOffTopic: boolean }> => {

    let actionToSend = playerAction;

    if (isOffTopic) {

        actionToSend = `[OFF-TOPIC]: ${playerAction}`;

    }

    return _sendMessageAndHandleResponse(actionToSend);

};



/**

 * Envia uma atualizaÃ§Ã£o de contexto do sistema para o histÃ³rico de chat da IA.

 */

export const updateAIContext = async (changeDescription: string): Promise<string> => {

    const context = 'narratorService.updateAIContext';

    

    if (!chatSession) {

        console.warn(`[${context}] Tentativa de atualizar o contexto da IA sem uma sessÃ£o ativa. Ignorando.`);

        return '';

    }

    

    const { prompts } = usePromptStore.getState();
    const stateChangeTag = resolvePrompt(prompts, 'STATE_CHANGE_CONTEXT_TAG', context).value;

    const contextMessage = stateChangeTag.replace('{description}', changeDescription);

    

    try {

        const { narrationText } = await _sendMessageAndHandleResponse(contextMessage);

        

        logEvent({

            type: 'system',

            message: 'Contexto da IA Mestre atualizado.',

            payload: { updateSent: contextMessage, aiAcknowledgement: narrationText }

        });



        return narrationText;

    } catch (error) {

        console.error(`[${context}] Falha ao enviar atualizaÃ§Ã£o de contexto para a IA:`, error);

        return '';

    }

};





