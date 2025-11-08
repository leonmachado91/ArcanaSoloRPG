// services/ai/narratorService.ts
// Este serviço é a ponte entre o estado do jogo e a IA Mestre Narradora.
// Após a refatoração, ele gerencia uma sessão de chat STATEFUL com a IA,
// mantendo a memória de curto prazo e o contexto da conversa.

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


// --- Variáveis de Escopo do Módulo ---

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY não encontrada. Verifique seu arquivo .env.local.");
}
const ai = new GoogleGenAI({ apiKey });

/** A sessão de chat ativa com a IA Mestre. É nula até ser inicializada. */
let chatSession: Chat | null = null;
/** Armazena o modelo usado na sessão para fins de logging. */
let activeModel: string = '';

const API_TIMEOUT_MS = 60000; // 60 segundos

// --- Helper Functions ---
/**
 * Formata uma mensagem de qualquer tipo em uma string de texto simples
 * para ser usada no histórico de hidratação da IA, garantindo que o contexto
 * mecânico e de eventos seja preservado.
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
        TIME_CONTEXT_TAG: prompts['TIME_CONTEXT_TAG']?.content,
        EVENT_CONTEXT_TAG: prompts['EVENT_CONTEXT_TAG']?.content,
        NEW_SCENE_CONTEXT_TAG_WITH_CARDS: prompts['NEW_SCENE_CONTEXT_TAG_WITH_CARDS']?.content,
        NEW_SCENE_CONTEXT_TAG: prompts['NEW_SCENE_CONTEXT_TAG']?.content,
        COMBAT_CONTEXT_TAG: prompts['COMBAT_CONTEXT_TAG']?.content,
        TEST_CONTEXT_TAG: prompts['TEST_CONTEXT_TAG']?.content,
        PENDING_TEST_CONTEXT_TAG: prompts['PENDING_TEST_CONTEXT_TAG']?.content
    };
    
    for (const key in tags) {
        if (!tags[key as keyof typeof tags]) {
            throw createAppError(
                'UNKNOWN_ERROR',
                `Prompt de tag de contexto '${key}' n�o encontrado.`,
                { missingTag: key, messageId: message.id },
                context
            );
        }
    }
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
    summaryParts.push(`- **Objetivo:** ${playerCharacter.objective || 'Não definido'}`);
    summaryParts.push(`- **Segredo:** ${playerCharacter.secret || 'Nenhum'}`);
    
    const playerConditions = playerCharacter.states?.filter(s => s && s.name);
    if (playerConditions && playerConditions.length > 0) {
        summaryParts.push(`- **Condições Ativas:** ${playerConditions.map(c => `${c.name} (${c.intensity})`).join(', ')}`);
    } else {
        summaryParts.push(`- **Condições Ativas:** Nenhuma`);
    }

    const characterIdsInScene = new Set(activeScene.characterIds || []);
    const npcsInScene = npcs.filter(npc => characterIdsInScene.has(npc.id));

    if (npcsInScene.length > 0) {
        summaryParts.push(`\n## Outros Personagens na Cena`);
        npcsInScene.forEach(npc => {
            summaryParts.push(`- **Nome:** ${npc.name} (ID: \`${npc.id}\`, Tipo: ${npc.type})`);
            const npcConditions = npc.states?.filter(s => s && s.name);
            if (npcConditions && npcConditions.length > 0) {
                summaryParts.push(`  - **Condições Ativas:** ${npcConditions.map(c => `${c.name} (${c.intensity})`).join(', ')}`);
            } else {
                 summaryParts.push(`  - **Condições Ativas:** Nenhuma`);
            }
        });
    }

    return summaryParts.join('\n');
};

/**
 * Função "core" que envia uma mensagem para a IA e gerencia o ciclo de resposta completo.
 */
const _sendMessageAndHandleResponse = async (
    messageToSend: string,
): Promise<{ narrationText: string; isOffTopic: boolean }> => {
    const startTime = Date.now();
    const context = 'narratorService._sendMessageAndHandleResponse';
    
    if (!chatSession) {
        throw createAppError('UNKNOWN_ERROR', 'A sessão de chat com a IA Mestre não foi inicializada.', null, context);
    }

    try {
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('API_TIMEOUT')), API_TIMEOUT_MS));

        const rawChatStore = useRawChatStore.getState();
        const userTurn: Content = { role: 'user', parts: [{ text: messageToSend }] };
        rawChatStore.setHistory([...rawChatStore.history, userTurn]);

        const apiCallPromise = chatSession.sendMessage({ message: messageToSend });
        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        
        // Extrai a narração de texto imediatamente, pois ela pode coexistir com as chamadas de ferramentas.
        const rawNarrationText = response.text?.trim() ?? '';
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

            // Se for uma ação de personagem ou uma ação pendente, não há um segundo turno para a IA.
            // A narração (se houver) já foi extraída. As ferramentas já postaram suas próprias mensagens no chat.
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
            
            const finalResponsePromise = chatSession.sendMessage({ message: functionResponses });
            const finalResponse = await Promise.race([finalResponsePromise, timeoutPromise]);
            
            if (finalResponse.candidates && finalResponse.candidates.length > 0) {
                const modelTurn2 = finalResponse.candidates[0].content;
                const currentHistory2 = useRawChatStore.getState().history;
                useRawChatStore.getState().setHistory([...currentHistory2, modelTurn2]);
            }

            const finalCandidate = finalResponse?.candidates?.[0];
            if (!finalCandidate || (finalCandidate.finishReason !== 'STOP' && finalCandidate.finishReason !== 'MAX_TOKENS')) {
                 const reason = finalCandidate?.finishReason || 'Desconhecido';
                 const message = `A IA não conseguiu narrar o resultado da ferramenta. Motivo: ${reason}.`;
                 throw createAppError('GEMINI_API_ERROR', message, { finishReason: reason }, context);
            }

            const rawFinalNarration = finalResponse.text?.trim() || '';
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
                 const message = reason === 'SAFETY' ? 'A IA se recusou a gerar o conteúdo por segurança.' : `A narração foi interrompida: ${reason}.`;
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
        const friendlyMessage = "Falha ao se comunicar com a IA Mestre. A narração não pôde ser gerada.";
        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);
    }
};

/**
 * Inicializa uma nova sessão de chat stateful com a IA Mestre.
 */
export const initializeChatSession = async (gameState: GameState): Promise<void> => {
    const context = 'narratorService.initializeChatSession';
    activeModel = useSettingsStore.getState().aiModels.gameMaster;
    const temperature = getConfig().ai.temperature;
    const { prompts } = usePromptStore.getState();

    const baseSystemInstruction = prompts['NARRATOR_SYSTEM_INSTRUCTION']?.content;
    const sessionStartTag = prompts['SESSION_START_CONTEXT_TAG']?.content;

    if (!baseSystemInstruction || !sessionStartTag) {
        throw createAppError('UNKNOWN_ERROR', 'Prompts essenciais da IA Mestre não foram encontrados. Verifique a base de dados.', null, context);
    }

    const { conditions } = useCatalogStore.getState();
    const conditionNames = conditions.length > 0 ? conditions.map(c => `'${c.name}'`).join(', ') : 'Nenhuma condição carregada.';
    const rulesCatalog = `### Catálogo de Regras do Jogo (Use estes nomes EXATOS ao aplicar condições):\n- Condições Válidas: ${conditionNames}.`;
    const systemInstruction = baseSystemInstruction.replace('{rulesCatalog}', rulesCatalog);

    logEvent({ type: 'system', message: `Iniciando sessão de chat com o modelo ${activeModel}.` });

    try {
        const summary = _generateGameStateSummary(gameState);
        const contextText = sessionStartTag.replace('{summary}', summary);
        const contextMessage: Content = { role: 'user', parts: [{ text: contextText }] };

        const recentHistory = gameState.campaign.chatHistory.slice(-10);
        const mappedHistory: Content[] = recentHistory
            .map((msg): Content | null => {
                const role = (msg.authorId === 'master' || msg.authorId === 'system') ? 'model' : 'user';
                const text = formatMessageForAIHistory(msg);
                if (text && text.trim() !== '') return { role, parts: [{ text }] };
                return null;
            })
            .filter((item): item is Content => item !== null);
        
        const initialHistory: Content[] = [contextMessage, ...mappedHistory];
        
        chatSession = ai.chats.create({
            model: activeModel,
            config: { systemInstruction, temperature, tools: [{ functionDeclarations: allToolDeclarations }] },
            history: initialHistory,
        });

        useRawChatStore.getState().setSystemInstruction(systemInstruction);
        useRawChatStore.getState().setHistory(initialHistory);

        logEvent({ type: 'system', message: 'Sessão de chat da IA Mestre inicializada com sucesso.', payload: { historyLength: initialHistory.length, model: activeModel } });

    } catch (error) {
        chatSession = null;
        useRawChatStore.getState().clearChat();
        const friendlyMessage = "Falha ao inicializar a memória da IA Mestre.";
        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);
    }
};

/**
 * Envia a ação do jogador para a sessão de chat e obtém a narração da IA.
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
 * Envia uma atualização de contexto do sistema para o histórico de chat da IA.
 */
export const updateAIContext = async (changeDescription: string): Promise<string> => {
    const context = 'narratorService.updateAIContext';
    
    if (!chatSession) {
        console.warn(`[${context}] Tentativa de atualizar o contexto da IA sem uma sessão ativa. Ignorando.`);
        return '';
    }
    
    const { prompts } = usePromptStore.getState();
    const stateChangeTag = prompts['STATE_CHANGE_CONTEXT_TAG']?.content;
    if (!stateChangeTag) {
        console.error(`[${context}] Prompt 'STATE_CHANGE_CONTEXT_TAG' não encontrado.`);
        return '';
    }

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
        console.error(`[${context}] Falha ao enviar atualização de contexto para a IA:`, error);
        return '';
    }
};


