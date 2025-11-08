// utils/aiUtils.ts
// Este arquivo contém funções utilitárias puras relacionadas a cálculos de custo
// e uso da API de IA. Essas funções são usadas para estimar o custo das chamadas
// aos modelos Gemini e para fins de logging no painel de desenvolvedor.

import { MODEL_DETAILS } from "../data/ai/models";

/**
 * Define uma estimativa aproximada de quantos caracteres compõem um token.
 * Este valor é uma heurística; o número real varia com o idioma e a complexidade do texto.
 * Usado para estimativas de custo antes de obter a contagem exata da API.
 */
const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * Estima o número de tokens com base no comprimento do texto.
 * @param text O texto de entrada a ser medido.
 * @returns O número estimado de tokens.
 */
export const calculateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);

/**
 * Calcula o custo estimado de uma chamada de IA com base nos tokens de entrada/saída e no modelo.
 * Leva em consideração os preços diferenciados (tiered pricing) para modelos como o Gemini 2.5 Pro.
 * @param inputTokens Número de tokens de entrada.
 * @param outputTokens Número de tokens de saída.
 * @param model O nome do modelo de IA utilizado (ex: 'gemini-2.5-flash').
 * @returns O custo estimado em USD. Retorna 0 se o modelo não for encontrado.
 */
export const calculateCost = (inputTokens: number, outputTokens: number, model: string): number => {
    const modelData = MODEL_DETAILS[model];
    if (!modelData) return 0; // Retorna 0 se o modelo não estiver no nosso registro de preços.

    const { pricing } = modelData;

    // Calcula o custo com base nos preços padrão.
    let inputCost = (inputTokens / 1_000_000) * pricing.input;
    let outputCost = (outputTokens / 1_000_000) * pricing.output;

    // Se o modelo tiver preços diferenciados e a contagem de tokens exceder o limite,
    // recalcula o custo usando os preços do tier superior.
    if (pricing.tiered && inputTokens > pricing.tiered.threshold) {
        inputCost = (inputTokens / 1_000_000) * pricing.tiered.input;
        outputCost = (outputTokens / 1_000_000) * pricing.tiered.output;
    }

    return inputCost + outputCost;
};
