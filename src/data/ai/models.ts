// data/ai/models.ts
// Este arquivo é a fonte central de verdade para todos os modelos de IA usados na aplicação.
// Ele define os preços, nomes amigáveis e quais modelos estão disponíveis para cada tipo de tarefa.
// Centralizar esta informação facilita a manutenção e a troca de modelos no futuro.

/**
 * Define os tipos de tarefas de IA que a aplicação pode executar.
 * Usado para mapear uma tarefa para um conjunto de modelos disponíveis e para logging.
 */
export type AiTask =
    | 'initialGeneration'
    | 'fullGeneration'
    | 'gameMaster'
    | 'imageGeneration'
    | 'audioGeneration';

/**
 * Interface para a estrutura de preços de um modelo de IA.
 * Os preços são baseados em 1 milhão de tokens.
 */
interface ModelPricing {
    /** Preço por 1 milhão de tokens de entrada. */
    input: number;
    /** Preço por 1 milhão de tokens de saída. */
    output: number;
    /** Estrutura opcional para preços diferenciados (tiered pricing) baseados no volume de tokens. */
    tiered?: {
        threshold: number; // Limite de tokens para o tier superior (ex: 200.000).
        input: number;
        output: number;
    }
}

/**
 * Interface que agrupa os detalhes de um modelo específico.
 */
export interface ModelDetails {
    /** Nome amigável do modelo para exibição na UI (ex: "Gemini 2.5 Pro"). */
    friendlyName: string;
    /** O objeto de preços para o modelo. */
    pricing: ModelPricing;
}

/**
 * Um registro (dicionário) que mapeia o nome de API de cada modelo para seus detalhes.
 * Esta é a principal fonte de dados para cálculos de custo.
 */
export const MODEL_DETAILS: Record<string, ModelDetails> = {
    "gemini-2.5-pro": {
        friendlyName: "Gemini 2.5 Pro",
        pricing: {
            input: 1.25,
            output: 10.00,
            tiered: {
                threshold: 200000,
                input: 2.50,
                output: 15.00,
            }
        }
    },
    "gemini-flash-latest": {
        friendlyName: "Gemini Flash",
        pricing: {
            input: 0.30,
            output: 2.50,
        }
    },
    "gemini-flash-lite-latest": {
        friendlyName: "Gemini Flash Lite",
        pricing: {
            input: 0.15,
            output: 1.25,
        }
    },
    "gemini-2.5-flash-preview-tts": {
        friendlyName: "Gemini 2.5 Flash TTS (Preview)",
        pricing: {
            input: 0.30, // Preço hipotético, pois a precificação de TTS pode variar.
            output: 2.50,
        }
    },
    "gemini-2.5-pro-preview-tts": {
        friendlyName: "Gemini 2.5 Pro TTS (Preview)",
        pricing: {
            input: 0.50, // Preço hipotético.
            output: 4.00,
        }
    },
    "gemini-2.5-flash-image": {
        friendlyName: "Nano Banana (Edição)",
        pricing: {
            input: 0.30, // Preço hipotético.
            output: 2.50,
        }
    }
};

/**
 * Interface para a configuração de modelos disponíveis para uma tarefa de IA específica.
 */
interface ModelConfig {
    /** Nome amigável da tarefa para exibição na UI (ex: "Mestre de Jogo (Chat)"). */
    label: string;
    /** Lista de nomes de API dos modelos disponíveis para esta tarefa. */
    available: string[];
}

// Agrupamento de modelos por capacidade.
const textModels = ["gemini-2.5-pro", "gemini-flash-latest", "gemini-flash-lite-latest"];
const audioModels = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
const imageModels = ["gemini-2.5-flash-image"];

/**
 * Mapeia cada `AiTask` para sua configuração correspondente.
 * Usado pelo painel de configurações para popular os seletores de modelo.
 */
export const AI_MODEL_CONFIG: Record<AiTask, ModelConfig> = {
    initialGeneration: {
        label: "Geração de Rascunho",
        available: textModels
    },
    fullGeneration: {
        label: "Geração de Campanha",
        available: textModels
    },
    gameMaster: {
        label: "Mestre de Jogo (Chat)",
        available: textModels
    },
    imageGeneration: {
        label: "Geração de Imagens",
        available: imageModels
    },
    audioGeneration: {
        label: "Modelo de Áudio (TTS)",
        available: audioModels
    }
};
