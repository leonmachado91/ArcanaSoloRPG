// services/ai/embeddingService.ts

import { GoogleGenAI } from "@google/genai";
import { logEvent } from "@/store/devLogStore";
import { createAppError } from "@/types/game";

// Initialize the Gemini API client.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY not found. Check your .env.local file.");
}
const ai = new GoogleGenAI({ apiKey });

// Define the embedding model to be used.
const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Generates a vector embedding for a given text string.
 * This is a core part of the RAG (Retrieval-Augmented Generation) system,
 * allowing for semantic search over the campaign's knowledge base.
 *
 * @param text The input text to be converted into an embedding.
 * @returns A promise that resolves with an array of numbers (the embedding vector), or null if the generation fails.
 */
export const generateEmbedding = async (text: string): Promise<number[] | null> => {
    const context = 'embeddingService.generateEmbedding';
    const startTime = Date.now();

    // The API might fail on empty strings, so we handle this case gracefully.
    if (!text || text.trim() === '') {
        logEvent({
            type: 'system',
            message: 'Embedding generation skipped for empty text.',
        });
        return null;
    }

    try {
        // FIX: Replaced deprecated `getGenerativeModel` and `model.embedContent` with the correct direct API call `ai.models.embedContent`.
        // This follows the modern stateless API pattern required by the SDK.
        const result = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          // FIX: Corrected property name from 'content' to 'contents' to match EmbedContentParameters type.
          contents: text,
        });
        
        // FIX: Corrected property name from 'embedding' to 'embeddings' and accessed the first element of the array.
        const embedding = result.embeddings[0];
        const endTime = Date.now();

        if (!embedding || !embedding.values) {
            throw createAppError('GEMINI_API_ERROR', 'A API de embedding não retornou um vetor válido.', result, context);
        }

        // Embedding models don't return token counts in the response, so we log 0.
        // Cost calculation is also omitted as it's typically based on characters or tokens
        // counted on the server side, which we don't have visibility into here.
        logEvent({
            type: 'ai',
            taskType: 'embeddingGeneration',
            modelUsed: EMBEDDING_MODEL,
            requestPrompt: `[Texto para Embedding]:\n${text.substring(0, 200)}...`,
            systemInstruction: 'Geração de Vetor de Embedding',
            rawResponse: `[Vetor de ${embedding.values.length} dimensões retornado]`,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: 0,
            responseTimeMs: endTime - startTime,
        });

        return embedding.values;

    } catch (error) {
        logEvent({
            type: 'ai',
            taskType: 'embeddingGeneration',
            modelUsed: EMBEDDING_MODEL,
            requestPrompt: `[Texto para Embedding]:\n${text.substring(0, 200)}...`,
            systemInstruction: 'Geração de Vetor de Embedding',
            rawResponse: `ERRO: ${error instanceof Error ? error.message : String(error)}`,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: 0,
            responseTimeMs: Date.now() - startTime,
        });

        // We return null to indicate failure without crashing the entire save process.
        // The calling service can decide how to handle the missing embedding.
        console.error(`[${context}] Falha ao gerar embedding:`, error);
        return null;
    }
};