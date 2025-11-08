// services/ai/campaignGeneratorService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { GameState, createAppError, isAppError } from "@/types/game";
import { Campaign } from "@/types/campaign";
import { Character } from "@/types/character";
import { Scene } from "@/types/scene";
import { Mission } from "@/types/mission";
import { Location } from "@/types/location";
import { CampaignLore } from "@/types/lore";
import { useSettingsStore } from "@/store/settingsStore";
import { logEvent } from "@/store/devLogStore";
import { calculateCost, calculateTokens } from "@/utils/aiUtils";
import { getConfig } from "@/services/configService";
import { usePromptStore } from "@/store/promptStore";
import { useCatalogStore } from "@/store/catalogStore";

// Initialize Gemini API client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY for Gemini not found. Check your .env.local file.");
}
const ai = new GoogleGenAI({ apiKey });

const API_TIMEOUT_MS = 120000; // 2 minutes for a very large generation

// =================================================================================
// PHASE 1: NARRATIVE SCRIPT SCHEMA
// =================================================================================
const narrativeScriptSchema = {
    type: Type.OBJECT,
    properties: {
        playerSecret: { type: Type.STRING, description: "Um segredo perigoso e único para o personagem do jogador, diretamente ligado à trama." },
        playerObjective: { type: Type.STRING, description: "O objetivo principal que o personagem do jogador deve alcançar para 'vencer' a campanha." },
        centralConflict: { type: Type.STRING, description: "O conflito central que impulsiona a história." },
        narrativeScript: {
            type: Type.OBJECT,
            description: "O roteiro completo da história, com todos os seus arcos.",
            properties: {
                thePast: { type: Type.STRING, description: "Eventos cruciais que aconteceram antes do jogo começar." },
                currentSituation: { type: Type.STRING, description: "O status quo no início da campanha." },
                theCalling: { type: Type.STRING, description: "O evento gatilho que inicia a aventura do jogador." },
                mainObjectiveSummary: { type: Type.STRING, description: "Uma visão geral do que precisa ser alcançado para resolver o conflito." },
                mainChallenges: {
                    type: Type.ARRAY,
                    description: "Uma série de 3 a 5 mini-arcos narrativos distintos que formam o corpo da campanha.",
                    items: { type: Type.STRING }
                },
                thePlotTwist: { type: Type.STRING, description: "A grande reviravolta que muda a percepção da história." },
                theClimax: { type: Type.STRING, description: "A confrontação ou evento final da campanha." },
                theLegacy: { type: Type.STRING, description: "As consequências da vitória ou derrota, o que acontece depois." }
            },
            required: ['thePast', 'currentSituation', 'theCalling', 'mainObjectiveSummary', 'mainChallenges', 'thePlotTwist', 'theClimax', 'theLegacy']
        },
        mainMystery: {
            type: Type.OBJECT,
            description: "O mistério central da trama.",
            properties: {
                title: { type: Type.STRING, description: "O título do mistério (ex: 'O Desaparecimento do Artefato')." },
                fullExplanation: { type: Type.STRING, description: "Uma explicação completa e detalhada da verdade por trás do mistério, suas origens, os envolvidos e as consequências. Este é o conhecimento secreto do mestre." },
                clues: {
                    type: Type.ARRAY,
                    description: "Uma lista de pistas verdadeiras que ajudam a resolver o mistério.",
                    items: { type: Type.STRING }
                },
                redHerrings: {
                    type: Type.ARRAY,
                    description: "Uma lista de pistas falsas para confundir a investigação.",
                    items: { type: Type.STRING }
                }
            },
            required: ['title', 'fullExplanation', 'clues', 'redHerrings']
        }
    },
    required: ['playerSecret', 'playerObjective', 'centralConflict', 'narrativeScript', 'mainMystery']
};

// =================================================================================
// PHASE 2: CHARACTER ROSTER SCHEMA
// =================================================================================
const characterSchemaProperties = {
    name: { type: Type.STRING, description: "O nome completo e único do personagem." },
    archetype: { type: Type.STRING, description: "O arquétipo do personagem (ex: Vilão, Mentor, Arauto)." },
    plotRelevance: { type: Type.STRING, description: "Explicação clara de como este personagem se conecta à trama principal fornecida." },
    age: { type: Type.INTEGER, description: "A idade do personagem." },
    description: { type: Type.STRING, description: "Uma descrição física detalhada e evocativa." },
    history: { type: Type.STRING, description: "Uma história de fundo rica, explicando suas origens e motivações." },
    personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de 3 a 5 traços de personalidade marcantes." },
    objective: { type: Type.STRING, description: "O objetivo principal e secreto do personagem na campanha." },
    secret: { type: Type.STRING, description: "Um segredo chocante ou uma fraqueza oculta." },
    behaviorPrompt: { type: Type.STRING, description: "Um prompt de sistema conciso para guiar a IA ao interpretar este personagem." },
    advantages: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Uma lista com os nomes das Vantagens que o personagem possui. DEVE haver pelo menos uma."
    },
    disadvantages: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Uma lista com os nomes das Desvantagens que o personagem possui. DEVE haver pelo menos uma."
    },
};
const requiredCharacterFields = ['name', 'archetype', 'plotRelevance', 'age', 'description', 'history', 'personalityTraits', 'objective', 'secret', 'behaviorPrompt', 'advantages', 'disadvantages'];

const characterRosterSchema = {
    type: Type.OBJECT,
    properties: {
        companions: {
            type: Type.ARRAY,
            description: "Uma lista de personagens companheiros para o jogador, conforme solicitado.",
            items: {
                type: Type.OBJECT,
                properties: characterSchemaProperties,
                required: requiredCharacterFields,
            },
        },
        npcs: {
            type: Type.ARRAY,
            description: "Uma lista de outros personagens não-jogadores importantes (vilões, mentores, etc.).",
            items: {
                type: Type.OBJECT,
                properties: characterSchemaProperties,
                required: requiredCharacterFields,
            },
        },
    },
    required: ['companions', 'npcs']
};

// =================================================================================
// PHASE 3: WORLD ELEMENTS SCHEMA
// =================================================================================
const worldElementsSchema = {
    type: Type.OBJECT,
    properties: {
        locations: {
            type: Type.ARRAY,
            description: "Uma lista de locais-chave onde a história se desenrolará.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "O nome único do local." },
                    description: { type: Type.STRING, description: "Uma descrição sensorial e detalhada do local." },
                    history: { type: Type.STRING, description: "A história ou lore associado ao local." },
                    plotRelevance: { type: Type.STRING, description: "Por que este local é importante para a trama principal fornecida." },
                },
                required: ['name', 'description', 'history', 'plotRelevance'],
            },
        },
        missions: {
            type: Type.ARRAY,
            description: "Uma lista de missões ou desafios iniciais para o jogador.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "O título da missão." },
                    description: { type: Type.STRING, description: "Uma descrição detalhada do objetivo da missão." },
                    isMainQuest: { type: Type.BOOLEAN, description: "Se esta é uma missão principal (true) ou secundária (false)." },
                },
                required: ['title', 'description', 'isMainQuest'],
            },
        },
        keyScenes: {
            type: Type.ARRAY,
            description: "As 2 a 3 cenas iniciais que darão o pontapé na campanha, com a primeira sendo a cena de abertura.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Um título conciso para a cena." },
                    description: { type: Type.STRING, description: "Uma descrição do que acontece na cena, preparando o palco para o jogador." },
                    charactersInScene: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Os nomes exatos dos personagens (do elenco fornecido) que já estão presentes no início da cena." },
                },
                required: ['title', 'description', 'charactersInScene'],
            },
        },
        keyItems: {
            type: Type.ARRAY,
            description: "Uma lista de 2 a 3 itens importantes para a trama (um de missão, os outros podem ser padrão).",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "O nome do item." },
                    description: { type: Type.STRING, description: "A descrição do item e sua relevância." },
                    item_type: { 
                        type: Type.STRING, 
                        description: "O tipo do item, que deve ser 'quest' para itens de missão ou 'standard' para itens comuns.",
                        enum: ['quest', 'standard'] 
                    },
                },
                required: ['name', 'description', 'item_type'],
            },
        },
    },
    required: ['locations', 'missions', 'keyScenes', 'keyItems'],
};

/**
 * Helper function to call the Gemini API with structured output, timeout, and logging.
 */
const _callArchitectAI = async (
    prompt: string,
    systemInstruction: string,
    schema: any, // The response schema for the specific phase
    model: string,
    temperature: number,
    taskType: string // For logging purposes
): Promise<any> => {
    const context = `campaignGeneratorService._callArchitectAI (${taskType})`;
    const startTime = Date.now();

    try {
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('API_TIMEOUT')), API_TIMEOUT_MS));
        const apiCallPromise = ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature
            },
        });

        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        
        const candidate = response?.candidates?.[0];
        if (!candidate || (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS')) {
             const reason = candidate?.finishReason || 'Desconhecido';
             const message = reason === 'SAFETY' ? 'A IA se recusou a gerar conteúdo por segurança.' : `A geração foi interrompida: ${reason}.`;
             throw createAppError('GEMINI_API_ERROR', message, { finishReason: reason }, context);
        }
        
        const jsonStr = response.text?.trim();
        if (!jsonStr) throw createAppError('GEMINI_API_ERROR', 'A IA Arquiteta retornou uma resposta vazia.', response, context);

        const aiGeneratedData = JSON.parse(jsonStr);
        const endTime = Date.now();

        logEvent({
            type: 'ai', requestPrompt: prompt, systemInstruction, rawResponse: jsonStr,
            inputTokens: calculateTokens(prompt + systemInstruction),
            outputTokens: calculateTokens(jsonStr),
            estimatedCost: calculateCost(calculateTokens(prompt + systemInstruction), calculateTokens(jsonStr), model),
            modelUsed: model, taskType: `fullGeneration-${taskType}`, responseTimeMs: endTime - startTime,
        });

        return aiGeneratedData;

    } catch (error: any) {
        if (isAppError(error)) throw error;
        if (error.message === 'API_TIMEOUT') throw createAppError('GEMINI_API_ERROR', 'A IA Arquiteta demorou muito para responder. Tente novamente.', null, context);
        if (error instanceof SyntaxError) throw createAppError('GEMINI_API_ERROR', 'A IA Arquiteta retornou um formato de dados inválido.', error, context);
        
        const friendlyMessage = "Falha na comunicação com a IA Arquiteta.";
        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);
    }
};

/**
 * Phase 1: Generates the core narrative script and main mystery.
 */
const _generateNarrativeScript = async (initialState: GameState): Promise<any> => {
    const context = 'orchestrator.phase1.narrative';
    const { prompts } = usePromptStore.getState();
    const systemInstruction = prompts['GENESIS_SYSTEM_INSTRUCTION']?.content;
    const promptTemplate = prompts['ORCHESTRATOR_PHASE1_NARRATIVE']?.content;
    if (!systemInstruction || !promptTemplate) {
        throw createAppError('UNKNOWN_ERROR', 'Prompts essenciais para a Fase 1 não foram encontrados.', null, context);
    }
    
    const creativeSeeds = {
        title: initialState.campaign.title,
        genre: initialState.campaign.genre,
        worldAdjective: initialState.campaign.worldAdjective,
        location: initialState.campaign.location,
        era: initialState.campaign.era,
        declarations: initialState.campaign.declarations,
    };
    
    const playerCharacterData = initialState.playerCharacter;
    const playerCharacterString = JSON.stringify({
        name: playerCharacterData.name,
        age: playerCharacterData.age,
        description: playerCharacterData.description,
        history: playerCharacterData.history,
        personalityTraits: playerCharacterData.personalityTraits,
        advantages: playerCharacterData.advantages,
        disadvantages: playerCharacterData.disadvantages,
    }, null, 2);

    const prompt = promptTemplate
        .replace('{creativeSeeds}', JSON.stringify(creativeSeeds, null, 2))
        .replace('{playerCharacterData}', playerCharacterString);
    
    return _callArchitectAI(
        prompt,
        systemInstruction,
        narrativeScriptSchema,
        useSettingsStore.getState().aiModels.fullGeneration,
        getConfig().ai.temperature,
        'Phase1-Narrative'
    );
};

/**
 * Phase 2: Generates the character roster based on the narrative script.
 */
const _generateCharacterRoster = async (initialState: GameState, narrativeScript: any): Promise<any> => {
    const context = 'orchestrator.phase2.characters';
    const { prompts } = usePromptStore.getState();
    const systemInstruction = prompts['GENESIS_SYSTEM_INSTRUCTION']?.content;
    const promptTemplate = prompts['ORCHESTRATOR_PHASE2_CHARACTERS']?.content;
     if (!systemInstruction || !promptTemplate) {
        throw createAppError('UNKNOWN_ERROR', 'Prompts essenciais para a Fase 2 não foram encontrados.', null, context);
    }

    const { traits } = useCatalogStore.getState();
    const advantagesOptions = traits.filter(t => t.type === 'advantage').map(t => t.name).join(', ');
    const disadvantagesOptions = traits.filter(t => t.type === 'disadvantage').map(t => t.name).join(', ');

    const creativeSeeds = {
        genre: initialState.campaign.genre,
        worldAdjective: initialState.campaign.worldAdjective,
        companionCount: initialState.campaign.companionCount,
    };

    const playerCharacterData = initialState.playerCharacter;
    const playerCharacterString = JSON.stringify({ name: playerCharacterData.name, history: playerCharacterData.history }, null, 2);

    const prompt = promptTemplate
        .replace('{creativeSeeds}', JSON.stringify(creativeSeeds, null, 2))
        .replace('{narrativeScript}', JSON.stringify(narrativeScript, null, 2))
        .replace('{playerCharacterData}', playerCharacterString)
        .replace('{advantagesOptions}', advantagesOptions)
        .replace('{disadvantagesOptions}', disadvantagesOptions);

    return _callArchitectAI(
        prompt,
        systemInstruction,
        characterRosterSchema,
        useSettingsStore.getState().aiModels.fullGeneration,
        getConfig().ai.temperature,
        'Phase2-Characters'
    );
};

/**
 * Phase 3: Generates locations, missions, and key scenes based on the plot and characters.
 */
const _generateWorldElements = async (initialState: GameState, narrativeScript: any, characterRoster: any): Promise<any> => {
    const context = 'orchestrator.phase3.world';
    const { prompts } = usePromptStore.getState();
    const systemInstruction = prompts['GENESIS_SYSTEM_INSTRUCTION']?.content;
    const promptTemplate = prompts['ORCHESTRATOR_PHASE3_WORLD']?.content;
    if (!systemInstruction || !promptTemplate) {
        throw createAppError('UNKNOWN_ERROR', 'Prompts essenciais para a Fase 3 não foram encontrados.', null, context);
    }
    
    const creativeSeeds = {
        location: initialState.campaign.location,
    };

    const playerCharacterData = initialState.playerCharacter;
    const playerCharacterString = JSON.stringify({ name: playerCharacterData.name }, null, 2);
    
    const characterNames = [
        ...characterRoster.companions.map((c: any) => c.name),
        ...characterRoster.npcs.map((c: any) => c.name),
    ];

    const prompt = promptTemplate
        .replace('{creativeSeeds}', JSON.stringify(creativeSeeds, null, 2))
        .replace('{narrativeScript}', JSON.stringify(narrativeScript, null, 2))
        .replace('{playerCharacterData}', playerCharacterString)
        .replace('{characterRoster}', JSON.stringify(characterNames, null, 2));

    return _callArchitectAI(
        prompt,
        systemInstruction,
        worldElementsSchema,
        useSettingsStore.getState().aiModels.fullGeneration,
        getConfig().ai.temperature,
        'Phase3-World'
    );
};

/**
 * Assembles the final GameState by combining the results from the three generation phases.
 */
const _assembleAndPopulateState = (
    initialState: GameState,
    narrativeScriptData: any,
    characterRoster: any,
    worldElements: any
): GameState => {
    const populatedState = JSON.parse(JSON.stringify(initialState));

    const { narrativeScript, mainMystery, centralConflict, playerSecret, playerObjective } = narrativeScriptData;
    const { companions, npcs } = characterRoster;
    const { locations, missions, keyScenes, keyItems } = worldElements;

    // --- 0. Populate Player Character Secret & Objective ---
    populatedState.playerCharacter.secret = playerSecret;
    populatedState.playerCharacter.objective = playerObjective;

    // --- 1. Populate Plot Details & Lore ---
    populatedState.campaign.plotDetails = {
        centralConflict: centralConflict,
        narrativeStructure: 'Jornada do Herói',
        mainMystery: mainMystery.title,
        finalObjective: narrativeScript.mainObjectiveSummary,
    };

    const loreEntries: CampaignLore[] = [];
    loreEntries.push({ id: uuidv4(), campaignId: populatedState.campaign.id, category: 'Conflito Central', content: centralConflict });
    
    Object.entries(narrativeScript).forEach(([key, value]) => {
        if (typeof value === 'string') {
            const category = `Roteiro - ${key.replace(/([A-Z])/g, ' $1').trim()}`;
            loreEntries.push({ id: uuidv4(), campaignId: populatedState.campaign.id, category, content: value });
        } else if (key === 'mainChallenges' && Array.isArray(value)) {
            value.forEach((challenge, index) => {
                loreEntries.push({ id: uuidv4(), campaignId: populatedState.campaign.id, category: `Roteiro - Desafio ${index + 1}`, content: challenge });
            });
        }
    });
    
    loreEntries.push({ id: uuidv4(), campaignId: populatedState.campaign.id, category: `Mistério - ${mainMystery.title} - A Verdade`, content: mainMystery.fullExplanation });
    mainMystery.clues.forEach((clue: string) => {
        loreEntries.push({ id: uuidv4(), campaignId: populatedState.campaign.id, category: `Pista - ${mainMystery.title}`, content: clue });
    });
    mainMystery.redHerrings.forEach((herring: string) => {
        loreEntries.push({ id: uuidv4(), campaignId: populatedState.campaign.id, category: `Pista Falsa - ${mainMystery.title}`, content: herring });
    });
    populatedState.campaign.lore = loreEntries;

    // --- 2. Populate Characters ---
    const allNewCharacters: Character[] = [];
    const newCompanions = (companions || []).map((c: any): Character => {
        const newChar: Character = { ...initialState.playerCharacter, id: uuidv4(), type: 'companion', ...c };
        allNewCharacters.push(newChar);
        return newChar;
    });
    const newNpcs = (npcs || []).map((c: any): Character => {
        const newChar: Character = { ...initialState.playerCharacter, id: uuidv4(), type: 'npc', ...c };
        allNewCharacters.push(newChar);
        return newChar;
    });
    populatedState.npcs = [...newCompanions, ...newNpcs];
    const characterNameIdMap = new Map(allNewCharacters.map(c => [c.name, c.id]));
    characterNameIdMap.set(populatedState.playerCharacter.name, populatedState.playerCharacter.id);

    // --- 3. Populate Key Scenes ---
    populatedState.campaign.scenes = (keyScenes || []).map((s: any, index: number): Scene => ({
        id: uuidv4(), campaignId: populatedState.campaign.id, sceneNumber: index + 1,
        title: s.title, description: s.description,
        arcanaCardsDrawn: undefined,
        isActive: index === 0, turnCount: 0,
        characterIds: Array.from(new Set([
            populatedState.playerCharacter.id,
            ...(s.charactersInScene || []).map((name: string) => characterNameIdMap.get(name)).filter(Boolean)
        ]))
    }));

    // --- 4. Populate Locations ---
    populatedState.campaign.locations = (locations || []).map((l: any): Location => ({
        id: uuidv4(), campaignId: populatedState.campaign.id, name: l.name,
        description: l.description, history: l.history, relevantInfo: l.plotRelevance,
    }));

    // --- 5. Populate Missions ---
    populatedState.campaign.missions = (missions || []).map((m: any): Mission => ({
        id: uuidv4(), campaignId: populatedState.campaign.id, title: m.title,
        description: m.description, status: 'pending',
    }));

    // --- 6. Populate Key Items ---
    populatedState.campaign.keyItems = keyItems || [];

    return populatedState;
};

/**
 * @deprecated This is the old monolithic generation function, kept for reference during transition.
 */
const _DEPRECATED_generateAndPopulateCampaign = async (initialState: GameState): Promise<GameState> => {
    // OBSOLETE
    // The logic for this function has been replaced by the orchestrated flow
    // calling _generateNarrativeScript, _generateCharacterRoster, _generateWorldElements,
    // and finally _assembleAndPopulateState.
    throw new Error("_DEPRECATED_generateAndPopulateCampaign should not be called. Use the orchestrated 'generateAndPopulateCampaign' instead.");
};


/**
 * Generates the full campaign world and populates the initial GameState using an orchestrated, multi-phase approach.
 * @param initialState The initial GameState with player choices.
 * @param onPhaseChange A callback to update the UI with the current generation phase.
 * @returns A promise that resolves to the fully populated GameState.
 */
export const generateAndPopulateCampaign = async (
    initialState: GameState,
    onPhaseChange: (message: string) => void
): Promise<GameState> => {
    
    // Phase 1: Generate Narrative Script
    onPhaseChange("Fase 1/3: Forjando a Trama...");
    const narrativeScript = await _generateNarrativeScript(initialState);

    // Phase 2: Generate Character Roster
    onPhaseChange("Fase 2/3: Despertando os Personagens...");
    const characterRoster = await _generateCharacterRoster(initialState, narrativeScript);

    // Phase 3: Generate World Elements
    onPhaseChange("Fase 3/3: Construindo os Reinos...");
    const worldElements = await _generateWorldElements(initialState, narrativeScript, characterRoster);

    // Final Assembly and Population (Task 5)
    onPhaseChange("Montando o mundo...");
    logEvent({ 
        type: 'system', 
        message: '[Orchestrator] All phases complete. Now proceeding to final assembly.',
        payload: { narrativeScript, characterRoster, worldElements }
    });
    
    // Replace the deprecated call with the new assembly function
    const populatedState = _assembleAndPopulateState(initialState, narrativeScript, characterRoster, worldElements);
    
    onPhaseChange("Aventura pronta!");

    return populatedState;
};