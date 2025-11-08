// services/ai/draftGeneratorService.ts
// Este serviço é responsável por interagir com a IA para gerar um rascunho
// criativo para a campanha e o personagem do jogador, com base em entradas parciais.

import { GoogleGenAI, Type } from "@google/genai";
import { createAppError, isAppError } from "@/types/game";
import { Campaign } from "@/types/campaign";
import { Character } from "@/types/character";
import { useSettingsStore } from "@/store/settingsStore";
import { logEvent } from "@/store/devLogStore";
import { calculateCost, calculateTokens } from "@/utils/aiUtils";
import { useCatalogStore } from "@/store/catalogStore";
import { personalityTraitsOptions } from "@/data/rules/traits";
import { getConfig } from "@/services/configService";
import { usePromptStore } from "@/store/promptStore";

// Inicializa o cliente da API Gemini.
// A chave é obtida via variáveis de ambiente configuradas no vite.config.ts
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY do Gemini não encontrada. Verifique seu arquivo .env.local.");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Define o tempo limite em milissegundos para a chamada à API de IA.
 */
const API_TIMEOUT_MS = 30000; // 30 segundos

/**
 * O schema completo com todas as propriedades que a IA pode gerar.
 * Usado como uma "biblioteca" para construir o schema dinâmico.
 */
const FULL_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        campaign: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Um título criativo para a campanha." },
                genre: { type: Type.STRING, description: "O gênero da campanha (ex: Fantasia Sombria)." },
                worldAdjective: { type: Type.STRING, description: "Um adjetivo que descreve o mundo (ex: Fragmentado)." },
                location: { type: Type.STRING, description: "O local inicial da aventura." },
                era: { type: Type.STRING, description: "A época em que a história se passa." },
                declarations: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Duas ou três verdades curtas e intrigantes sobre o mundo do jogo."
                },
            },
        },
        character: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Um nome apropriado para o personagem." },
                age: { type: Type.INTEGER, description: "A idade do personagem." },
                description: { type: Type.STRING, description: "Uma breve descrição física do personagem." },
                history: { type: Type.STRING, description: "Um resumo conciso da história de fundo do personagem." },
                personalityTraits: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Entre 2 a 4 traços de personalidade. Use a lista de opções como inspiração, mas sinta-se livre para criar novos."
                },
                advantages: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Uma ou mais vantagens da lista fornecida. A quantidade deve ser igual à de desvantagens."
                },
                disadvantages: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Uma ou mais desvantagens da lista fornecida. A quantidade deve ser igual à de vantagens."
                },
            },
        },
    },
};

/**
 * Verifica se um valor deve ser considerado "vazio" para a geração de rascunho.
 */
const isFieldConsideredEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim() === '')) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'number' && value === 0) return true; // Para `age`
    return false;
};

/**
 * Valida se a IA retornou dados válidos para os campos solicitados.
 */
const validateAiResponse = (aiData: any, fieldsToGenerate: string[]) => {
    for (const fieldPath of fieldsToGenerate) {
        const [objKey, fieldKey] = fieldPath.split('.');
        const value = aiData?.[objKey]?.[fieldKey];
        if (isFieldConsideredEmpty(value)) {
            throw new Error(`A IA não conseguiu gerar um valor válido para o campo '${fieldPath}'.`);
        }
    }
    // Valida a regra 1:1 para vantagens e desvantagens, se foram geradas
    if (fieldsToGenerate.includes('character.advantages') || fieldsToGenerate.includes('character.disadvantages')) {
        const advantages = aiData.character?.advantages || [];
        const disadvantages = aiData.character?.disadvantages || [];
        if (advantages.length !== disadvantages.length) {
            throw new Error('A IA não respeitou a regra 1:1 de vantagens e desvantagens.');
        }
    }
};


/**
 * Gera um rascunho para a campanha e o personagem, respeitando os dados já preenchidos.
 */
export const generateDraft = async (
    partialCampaign: Partial<Campaign>,
    partialCharacter: Partial<Character>
): Promise<{ campaign: Partial<Campaign>, character: Partial<Character> }> => {
    const startTime = Date.now();
    const context = 'draftGeneratorService.generateDraft';
    const model = useSettingsStore.getState().aiModels.initialGeneration;
    const { traits } = useCatalogStore.getState();
    const temperature = getConfig().ai.temperature;
    const { prompts } = usePromptStore.getState();

    // Valida se os prompts necessários foram carregados.
    const systemInstruction = prompts['DRAFT_GENERATOR_SYSTEM_INSTRUCTION']?.content;
    const promptTemplate = prompts['DRAFT_GENERATOR_PROMPT_TEMPLATE']?.content;
    const fallbackPrompt = prompts['DRAFT_FALLBACK_PROMPT']?.content;

    if (!systemInstruction || !promptTemplate || !fallbackPrompt) {
        throw createAppError('UNKNOWN_ERROR', 'Prompts essenciais para o gerador de rascunho não foram encontrados. Verifique a base de dados.', null, context);
    }

    const contextData: { campaign: Record<string, any>, character: Record<string, any> } = { campaign: {}, character: {} };
    const dynamicSchema: any = { type: Type.OBJECT, properties: {} };
    const fieldsToGenerate: string[] = [];

    // Processa campos da campanha
    const campaignSchemaDef = FULL_RESPONSE_SCHEMA.properties.campaign.properties;
    if (campaignSchemaDef) {
        const requiredCampaignFields: string[] = [];
        dynamicSchema.properties.campaign = { type: Type.OBJECT, properties: {} };
        Object.keys(campaignSchemaDef).forEach(key => {
            const value = (partialCampaign as any)[key];
            if (isFieldConsideredEmpty(value)) {
                (dynamicSchema.properties.campaign.properties as any)[key] = (campaignSchemaDef as any)[key];
                fieldsToGenerate.push(`campaign.${key}`);
                requiredCampaignFields.push(key);
            } else {
                contextData.campaign[key] = value;
            }
        });
        if (requiredCampaignFields.length > 0) {
            dynamicSchema.properties.campaign.required = requiredCampaignFields;
        }
    }
    
    // Processa campos do personagem
    const characterSchemaDef = FULL_RESPONSE_SCHEMA.properties.character.properties;
    if (characterSchemaDef) {
        const requiredCharacterFields: string[] = [];
        dynamicSchema.properties.character = { type: Type.OBJECT, properties: {} };
        Object.keys(characterSchemaDef).forEach(key => {
            const value = (partialCharacter as any)[key];
            if (isFieldConsideredEmpty(value)) {
                (dynamicSchema.properties.character.properties as any)[key] = (characterSchemaDef as any)[key];
                fieldsToGenerate.push(`character.${key}`);
                requiredCharacterFields.push(key);
            } else {
                contextData.character[key] = value;
            }
        });
        if (requiredCharacterFields.length > 0) {
            dynamicSchema.properties.character.required = requiredCharacterFields;
        }
    }

    if (fieldsToGenerate.length === 0) {
        return { campaign: partialCampaign, character: partialCharacter };
    }
    
    // Limpa sub-schemas que não têm propriedades para gerar
    if (Object.keys(dynamicSchema.properties.campaign.properties).length === 0) delete dynamicSchema.properties.campaign;
    if (Object.keys(dynamicSchema.properties.character.properties).length === 0) delete dynamicSchema.properties.character;
    
    const contextString = (Object.keys(contextData.campaign).length === 0 && Object.keys(contextData.character).length === 0)
        ? fallbackPrompt
        : JSON.stringify(contextData, null, 2);

    const prompt = promptTemplate
        .replace('{contextData}', contextString)
        .replace('{personalityTraitsOptions}', personalityTraitsOptions.join(', '))
        .replace('{advantagesOptions}', traits.filter(t => t.type === 'advantage').map(t => t.name).join(', '))
        .replace('{disadvantagesOptions}', traits.filter(t => t.type === 'disadvantage').map(t => t.name).join(', '));

    try {
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('API_TIMEOUT')), API_TIMEOUT_MS));

        const apiCallPromise = ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { systemInstruction, responseMimeType: "application/json", responseSchema: dynamicSchema, temperature },
        });

        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        
        const candidate = response?.candidates?.[0];
        if (!candidate || (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS')) {
             const reason = candidate?.finishReason || 'Desconhecido';
             const message = reason === 'SAFETY' ? 'A IA se recusou a gerar o conteúdo por segurança. Tente ajustar os parâmetros.' : `A geração foi interrompida: ${reason}.`;
             throw createAppError('GEMINI_API_ERROR', message, { finishReason: reason }, context);
        }
        
        const jsonStr = response.text?.trim();
        if (!jsonStr) throw createAppError('GEMINI_API_ERROR', 'A IA retornou uma resposta vazia.', response, context);

        const endTime = Date.now();
        const aiGeneratedData = JSON.parse(jsonStr);

        validateAiResponse(aiGeneratedData, fieldsToGenerate);

        const finalCampaign = { ...partialCampaign, ...aiGeneratedData.campaign };
        const finalCharacter = { ...partialCharacter, ...aiGeneratedData.character };

        // Validação de traits "alucinados"
        const validTraitNames = new Set(traits.map(t => t.name));
        if (finalCharacter.advantages) {
            finalCharacter.advantages = finalCharacter.advantages.filter((adv: string) => validTraitNames.has(adv));
        }
        if (finalCharacter.disadvantages) {
            finalCharacter.disadvantages = finalCharacter.disadvantages.filter((dis: string) => validTraitNames.has(dis));
        }
        
        logEvent({
            type: 'ai', requestPrompt: prompt, systemInstruction, rawResponse: jsonStr,
            inputTokens: calculateTokens(prompt + systemInstruction),
            outputTokens: calculateTokens(jsonStr),
            estimatedCost: calculateCost(calculateTokens(prompt + systemInstruction), calculateTokens(jsonStr), model),
            modelUsed: model, taskType: 'initialGeneration', responseTimeMs: endTime - startTime,
        });

        return { campaign: finalCampaign, character: finalCharacter };

    } catch (error: any) {
        if (isAppError(error)) throw error;
        if (error.message === 'API_TIMEOUT') throw createAppError('GEMINI_API_ERROR', 'A IA demorou muito para responder. Tente novamente.', null, context);
        if (error instanceof SyntaxError) throw createAppError('GEMINI_API_ERROR', 'A IA retornou um formato de dados inválido.', error, context);
        
        const friendlyMessage = "Falha ao gerar o rascunho. A IA pode estar indisponível ou a requisição falhou.";
        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);
    }
};