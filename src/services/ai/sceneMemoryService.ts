// services/ai/sceneMemoryService.ts
// Encapsula a chamada ao modelo de IA responsável por transformar uma cena
// completa em um diário cronológico consumível pelo RAG.

import { GoogleGenAI } from '@google/genai';
import { logEvent } from '@/store/devLogStore';
import { calculateTokens, calculateCost } from '@/utils/aiUtils';
import { getConfig } from '../configService';
import { usePromptStore } from '@/store/promptStore';
import { resolvePrompt } from './promptFallbacks';
import { createAppError } from '@/types/game';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não encontrada. Verifique seu arquivo .env.local.");
}

const ai = new GoogleGenAI({ apiKey });

export interface SceneDiaryInput {
    metadataBlock: string;
    playerSummary: string;
    npcsSummary: string;
    objectivesSummary: string;
    sceneLog: string;
}

export interface SceneDiaryResult {
    diary: string;
    inputTokens: number;
    outputTokens: number;
    responseTimeMs: number;
    modelUsed: string;
    estimatedCost: number;
}

const extractTextFromParts = (parts?: Array<{ text?: string }>): string => {
    if (!parts) return '';
    return parts
        .map(part => (part && typeof part.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n')
        .trim();
};

export const generateSceneDiary = async (input: SceneDiaryInput): Promise<SceneDiaryResult> => {
    const { prompts } = usePromptStore.getState();
    const template = resolvePrompt(prompts, 'SCENE_CONSOLIDATION_PROMPT', 'sceneMemoryService.generateSceneDiary').value;

    const prompt = template
        .replace('{scene_metadata}', input.metadataBlock)
        .replace('{player_summary}', input.playerSummary)
        .replace('{npcs_summary}', input.npcsSummary)
        .replace('{objectives_summary}', input.objectivesSummary)
        .replace('{scene_log}', input.sceneLog);

    const model = getConfig().ai.defaults.sceneDiary || getConfig().ai.defaults.fullGeneration;
    const startTime = Date.now();

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const candidate = response.candidates?.[0];
        const diary = extractTextFromParts(candidate?.content?.parts);
        if (!diary) {
            throw createAppError('GEMINI_API_ERROR', 'A IA não retornou o diário da cena.', response, 'sceneMemoryService.generateSceneDiary');
        }

        const responseTime = Date.now() - startTime;
        const inputTokens = calculateTokens(prompt);
        const outputTokens = calculateTokens(diary);
        const estimatedCost = calculateCost(inputTokens, outputTokens, model);

        logEvent({
            type: 'ai',
            requestPrompt: prompt,
            systemInstruction: 'Scene Memory Consolidation',
            rawResponse: diary,
            inputTokens,
            outputTokens,
            estimatedCost,
            modelUsed: model,
            taskType: 'scene_memory',
            responseTimeMs: responseTime,
        });

        return { diary, inputTokens, outputTokens, responseTimeMs: responseTime, modelUsed: model, estimatedCost };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        logEvent({
            type: 'ai',
            requestPrompt: prompt,
            systemInstruction: 'Scene Memory Consolidation',
            rawResponse: `ERRO: ${error instanceof Error ? error.message : String(error)}`,
            inputTokens: calculateTokens(prompt),
            outputTokens: 0,
            estimatedCost: 0,
            modelUsed: model,
            taskType: 'scene_memory',
            responseTimeMs: responseTime,
        });
        if (error instanceof Error) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Falha inesperada ao consolidar a cena.', error, 'sceneMemoryService.generateSceneDiary');
    }
};
