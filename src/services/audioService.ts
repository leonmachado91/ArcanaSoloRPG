// services/audioService.ts
// Este serviço é o único ponto de contato da aplicação com a API de Text-to-Speech (TTS) do Gemini.
// Ele é responsável por construir prompts de narração, chamar a API, processar a resposta
// de áudio e registrar os eventos de log relevantes.

import { GoogleGenAI, Modality } from "@google/genai";
import { logEvent } from "../store/devLogStore";
import { calculateTokens, calculateCost } from '../utils/aiUtils';
import { AI_MODEL_CONFIG } from "../data/ai/models";
import { Message } from "../types/chat";
import { createAppError, isAppError } from "../types/game";
import { usePromptStore } from "@/store/promptStore";

// Inicializa o cliente da API Gemini.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY do Gemini não encontrada. Verifique seu arquivo .env.local.");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Cria um prompt de narração contextual para a IA, com base no autor e no conteúdo da mensagem.
 * Isso instrui a IA a adotar um tom ou personalidade específica.
 * @param message A mensagem a ser narrada.
 * @returns O prompt completo para a IA de TTS.
 */
const createNarrationPrompt = (message: Message): string => {
    const { prompts } = usePromptStore.getState();
    const masterNarrationPrompt = prompts['MASTER_NARRATION_PROMPT']?.content;
    const masterNarrationWithEmotionPrompt = prompts['MASTER_NARRATION_WITH_EMOTION_PROMPT']?.content;
    const characterNarrationPrompt = prompts['CHARACTER_NARRATION_PROMPT']?.content;

    if (!masterNarrationPrompt || !masterNarrationWithEmotionPrompt || !characterNarrationPrompt) {
        console.error("[audioService] Prompts de narração não encontrados no store.");
        // Fallback para o texto puro se os prompts não estiverem disponíveis
        return message.text;
    }

    const isMasterOrSystem = message.authorId === 'master' || message.authorId === 'system';
    
    // Se a mensagem é do mestre e contém uma emoção (do sorteio de cartas), usa um prompt com tom emocional.
    if (isMasterOrSystem) {
        if (message.cardDraw?.emotion) {
            return masterNarrationWithEmotionPrompt
                .replace('{emotion}', message.cardDraw.emotion)
                .replace('{text}', message.text);
        }
        return masterNarrationPrompt.replace('{text}', message.text);
    }

    // Se a mensagem é de um personagem com traços de personalidade, usa um prompt de atuação.
    if (message.author && message.author.personalityTraits?.length > 0) {
        const traits = message.author.personalityTraits.join(', ');
        return characterNarrationPrompt
            .replace('{traits}', traits)
            .replace('{text}', message.text);
    }

    // Caso contrário, retorna apenas o texto da mensagem como prompt.
    return message.text;
};

/**
 * Gera áudio a partir de um texto usando a API Gemini (TTS).
 * @param message A mensagem completa a ser convertida em áudio.
 * @param voiceName O nome da voz a ser usada (ex: 'Zephyr').
 * @param model O modelo de IA a ser usado (ex: 'gemini-2.5-flash-preview-tts').
 * @returns Uma promessa que resolve com um objeto contendo a string base64 do áudio e seu mimeType.
 * @throws {AppError} Se a geração de áudio falhar.
 */
export const generateAudio = async (message: Message, voiceName: string, model: string): Promise<{ audioBase64: string; mimeType: string }> => {
    const startTime = Date.now();
    const taskType = AI_MODEL_CONFIG.audioGeneration.label;
    const context = 'generateAudio';
    
    const fullPrompt = createNarrationPrompt(message);

    try {
        const response = await ai.models.generateContent({
            model: model, 
            contents: {
                parts: [{ text: fullPrompt }],
            },
            config: {
                // Solicita que a resposta seja em formato de áudio.
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                },
            },
        });
        
        const endTime = Date.now();
        
        // Extrai a parte de áudio da resposta da API.
        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
        
        if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
            const errorDetails = `A API não retornou dados de áudio válidos. Resposta: ${JSON.stringify(response, null, 2)}`;
            throw createAppError('GEMINI_API_ERROR', 'A resposta da IA não continha áudio. O texto pode ser muito curto.', errorDetails, context);
        }

        const audioBase64 = audioPart.inlineData.data;
        const mimeType = audioPart.inlineData.mimeType;

        // Estima tokens para logging (a resposta da API TTS não fornece contagem de tokens).
        const inputTokens = calculateTokens(fullPrompt);
        const outputTokens = calculateTokens(audioBase64); // Estimativa baseada no tamanho do base64

        // Registra o evento de sucesso no log do desenvolvedor.
        logEvent({
            type: 'ai',
            requestPrompt: `[PROMPT COMPLETO ENVIADO PARA TTS]\n\n${fullPrompt}\n\n[VOZ: ${voiceName}]`,
            systemInstruction: "Geração de Áudio (TTS)",
            rawResponse: `[Conteúdo de áudio ${mimeType} em Base64]`,
            inputTokens,
            outputTokens,
            estimatedCost: calculateCost(inputTokens, outputTokens, model),
            modelUsed: model,
            taskType: taskType,
            responseTimeMs: endTime - startTime,
        });
        
        return { audioBase64, mimeType };

    } catch (error) {
        // Em caso de erro, registra o evento de falha no log.
        const errorMessage = error instanceof Error ? error.message : String(error);
        logEvent({
            type: 'ai',
            requestPrompt: `[PROMPT COMPLEto ENVIADO PARA TTS]\n\n${fullPrompt}\n\n[VOZ: ${voiceName}]`,
            systemInstruction: "Geração de Áudio (TTS)",
            rawResponse: `ERRO: ${errorMessage}`,
            inputTokens: calculateTokens(fullPrompt),
            outputTokens: 0,
            estimatedCost: 0,
            modelUsed: model,
            taskType: taskType,
            responseTimeMs: Date.now() - startTime,
        });

        if (isAppError(error)) throw error;
        
        // Cria e lança um erro padronizado `AppError` com uma mensagem amigável.
        const friendlyMessage = errorMessage.includes('404') 
            ? `O modelo de áudio '${model}' não foi encontrado. Verifique se o nome está correto.`
            : "Falha na comunicação com a IA para gerar áudio.";

        throw createAppError('GEMINI_API_ERROR', friendlyMessage, error, context);
    }
};