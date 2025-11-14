// services/ai/imageGenerationService.ts
// Constrói prompts ricos, chama os modelos de imagem selecionados pelo usuário
// (apenas Gemini 2.5 Flash Image via generateContent) e salva a saída no Supabase Storage.

import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { Campaign } from '@/types/campaign';
import { ArcanaCardDraw, Message } from '@/types/chat';
import { Scene } from '@/types/scene';
import { Character } from '@/types/character';
import { logEvent } from '@/store/devLogStore';
import { calculateCost, calculateTokens } from '@/utils/aiUtils';
import { supabase } from '@/services/db/supabaseClient';
import { usePromptStore } from '@/store/promptStore';
import { resolvePrompt } from './promptFallbacks';
import { createAppError } from '@/types/game';
import { MODEL_DETAILS } from '@/data/ai/models';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY não definida. Configure a chave no .env.local.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY, apiVersion: 'v1alpha' });
const STORAGE_BUCKET = 'campaign-media';
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash-image';

export interface ImageReference {
    name: string;
    url: string;
}

export interface ImageGenerationMetrics {
    model: string;
    modelLabel: string;
    mode: 'generate' | 'edit';
    responseTimeMs: number;
    estimatedCostUsd: number;
    promptTokens: number;
    outputTokens: number;
    storagePath: string;
    referencesAttached: number;
}

export interface ImageGenerationResult {
    imageUrl: string;
    storagePath: string;
    prompt: string;
    metrics: ImageGenerationMetrics;
    modelUsed: string;
}

interface GenerationContext {
    prompt: string;
    aspectRatio: string;
    references?: ImageReference[];
    type: 'character' | 'scene';
    campaignId: string;
    storageMetadata?: Record<string, string | undefined>;
}

interface GenerationPayload {
    blob: Blob;
    mimeType: string;
    responseTimeMs: number;
    estimatedCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    referencesUsed: number;
    mode: 'generate' | 'edit';
    model: string;
    modelLabel: string;
}

interface InlineReferenceData {
    name: string;
    mimeType: string;
    data: string;
}

const extractErrorMessage = (error: unknown): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message;
    }
    return '';
};

const isQuotaError = (error: unknown): boolean => {
    const message = extractErrorMessage(error).toLowerCase();
    return (
        message.includes('quota exceeded') ||
        message.includes('rate limit') ||
        message.includes('resource_exhausted')
    );
};

const sanitizeBase64 = (value: string) => value.replace(/^data:image\/\w+;base64,/, '');

const base64ToBlob = (value: string, mimeType = 'image/png'): Blob => {
    const normalized = sanitizeBase64(value);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const fetchImageAsBlob = async (url: string): Promise<{ blob: Blob; mimeType: string }> => {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
        throw createAppError('NETWORK_ERROR', 'Falha ao baixar uma imagem de referência.', { status: response.status, url }, 'imageGenerationService.fetchImageAsBlob');
    }
    const mimeType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    return { blob: new Blob([arrayBuffer], { type: mimeType }), mimeType };
};

const referenceToInlineData = async (reference: ImageReference): Promise<InlineReferenceData | null> => {
    try {
        const { blob, mimeType } = await fetchImageAsBlob(reference.url);
        const data = arrayBufferToBase64(await blob.arrayBuffer());
        return { name: reference.name, mimeType, data };
    } catch (error) {
        console.warn('[imageGenerationService] Referência ignorada ao preparar Gemini Flash Image.', error);
        return null;
    }
};

const uploadToStorage = async (
    campaignId: string,
    type: 'character' | 'scene',
    blob: Blob,
    metadata?: Record<string, string | undefined>
): Promise<{ storagePath: string; publicUrl: string }> => {
    if (!campaignId) {
        throw createAppError('VALIDATION_ERROR', 'Campanha sem ID. Não é possível salvar a imagem.', null, 'imageGenerationService.uploadToStorage');
    }
    const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${uuidv4()}.${extension}`;
    const storagePath = `${campaignId}/images/${type}/${fileName}`;
    const metadataStrings: Record<string, string> = {};
    if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
            if (value) {
                metadataStrings[key] = String(value).slice(0, 255);
            }
        });
    }

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, blob, {
        upsert: true,
        cacheControl: '31536000',
        contentType: blob.type || 'image/png',
        metadata: Object.keys(metadataStrings).length ? metadataStrings : undefined,
    });
    if (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao enviar a imagem para o Supabase Storage.', error, 'imageGenerationService.uploadToStorage');
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    if (!data?.publicUrl) {
        throw createAppError('SUPABASE_ERROR', 'Não foi possível obter a URL pública da imagem.', data, 'imageGenerationService.uploadToStorage');
    }

    return { storagePath, publicUrl: data.publicUrl };
};

const getDefaultModelInfo = () => {
    const friendlyName = MODEL_DETAILS[GEMINI_FLASH_MODEL]?.friendlyName || 'Gemini 2.5 Flash Image';
    return { model: GEMINI_FLASH_MODEL, modelLabel: friendlyName };
};

const callGeminiFlashImage = async (
    context: GenerationContext,
    model: string,
    modelLabel: string
): Promise<Omit<GenerationPayload, 'model' | 'modelLabel'>> => {
    const start = Date.now();
    const inlineRefs = await Promise.all((context.references || []).map(referenceToInlineData));
    const validRefs = inlineRefs.filter((ref): ref is InlineReferenceData => Boolean(ref));

    const parts: any[] = [{ text: context.prompt }];
    if (validRefs.length > 0) {
        parts.push({
            text: 'As imagens seguintes são referências visuais. Preserve o estilo e a composição dos personagens indicados.',
        });
        validRefs.forEach(ref => {
            parts.push({ text: `Referência: ${ref.name}` });
            parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
        });
    }

    const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
    });

    const imagePart = response.candidates
        ?.flatMap(candidate => candidate.content?.parts || [])
        .find(part => part.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart?.inlineData?.data) {
        throw createAppError('GEMINI_API_ERROR', 'O Gemini não retornou nenhum dado de imagem.', response, 'imageGenerationService.callGeminiFlashImage');
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const blob = base64ToBlob(imagePart.inlineData.data, mimeType);
    const responseTimeMs = Date.now() - start;
    const referencesUsed = validRefs.length;
    const inputTokens = calculateTokens(context.prompt);
    const outputTokens = calculateTokens(imagePart.inlineData.data);
    const estimatedCostUsd = calculateCost(inputTokens, outputTokens, model);

    logEvent({
        type: 'ai',
        requestPrompt: context.prompt,
        systemInstruction: `Geração de Imagem (${modelLabel})`,
        rawResponse: `[Imagem recebida: ${blob.size} bytes]`,
        inputTokens,
        outputTokens,
        estimatedCost: estimatedCostUsd,
        modelUsed: model,
        taskType: referencesUsed > 0 ? 'image_generation_edit' : 'image_generation',
        responseTimeMs,
    });

    return {
        blob,
        mimeType,
        responseTimeMs,
        estimatedCostUsd,
        inputTokens,
        outputTokens,
        referencesUsed,
        mode: referencesUsed > 0 ? 'edit' : 'generate',
    };
};

const runImageGeneration = async (context: GenerationContext): Promise<GenerationPayload> => {
    const { model, modelLabel } = getDefaultModelInfo();
    const references = context.references || [];

    try {
        const geminiPayload = await callGeminiFlashImage(context, model, modelLabel);
        return { ...geminiPayload, model, modelLabel };
    } catch (error) {
        if (isQuotaError(error)) {
            const message = 'Atingimos o limite gratuito do Gemini para imagens. Ajuste seu plano em https://ai.dev/usage ou tente novamente mais tarde.';
            throw createAppError('GEMINI_API_ERROR', message, error, 'imageGenerationService.runImageGeneration');
        }
        throw error;
    }
};

const persistResult = async (generation: GenerationPayload, context: GenerationContext): Promise<ImageGenerationResult> => {
    const storageMetadata = {
        model: generation.model,
        model_label: generation.modelLabel,
        prompt_excerpt: context.prompt.slice(0, 200),
        references: (context.references || []).map(ref => ref.name).join(', '),
        generation_mode: generation.mode,
        ...context.storageMetadata,
    };

    const { storagePath, publicUrl } = await uploadToStorage(context.campaignId, context.type, generation.blob, storageMetadata);

    const metrics: ImageGenerationMetrics = {
        model: generation.model,
        modelLabel: generation.modelLabel,
        mode: generation.mode,
        responseTimeMs: generation.responseTimeMs,
        estimatedCostUsd: generation.estimatedCostUsd,
        promptTokens: generation.inputTokens,
        outputTokens: generation.outputTokens,
        storagePath,
        referencesAttached: generation.referencesUsed,
    };

    logEvent({
        type: 'system',
        message: '[Imagem] Arquivo salvo no Supabase Storage.',
        payload: {
            storagePath,
            model: generation.model,
            mode: generation.mode,
            responseTimeMs: generation.responseTimeMs,
        },
    });

    return {
        imageUrl: publicUrl,
        storagePath,
        prompt: context.prompt,
        metrics,
        modelUsed: generation.model,
    };
};

const describeArcana = (cards?: ArcanaCardDraw) => {
    if (!cards) {
        return 'Sem cartas ou emoção ativa registrada.';
    }
    return `Verbo: ${cards.verb}. Tema: ${cards.theme}. Adjetivo: ${cards.adjective}. Emoção predominante: ${cards.emotion}.`;
};

const summarizeCharacter = (character: Character, campaign: Campaign) => {
    const lines = [
        `${character.name} (${character.type}) — ${character.archetype || 'arquetipo indefinido'}`,
        character.description || 'Descrição ausente.',
        character.objective ? `Objetivo atual: ${character.objective}` : null,
        character.secret ? `Segredo guardado: ${character.secret}` : null,
        character.personalityTraits?.length ? `Traços marcantes: ${character.personalityTraits.join(', ')}` : null,
        character.states?.length
            ? `Condições ativas: ${character.states.map(state => `${state.name} (${state.intensity || 'N/A'})`).join(', ')}`
            : null,
        character.history ? `Histórico relevante: ${character.history}` : null,
        `Campanha: ${campaign.title} (${campaign.genre || 'gênero indefinido'})`,
    ].filter(Boolean);
    return lines.join('\n');
};

const summarizeCharactersInScene = (characters: Character[]) => {
    if (!characters.length) {
        return 'Nenhum personagem listado na cena.';
    }
    return characters
        .map(character => {
            const fragments = [
                `• ${character.name} (${character.type})`,
                character.description ? `  Aparência: ${character.description}` : null,
                character.personalityTraits?.length ? `  Traços: ${character.personalityTraits.join(', ')}` : null,
                character.states?.length
                    ? `  Condições: ${character.states.map(state => `${state.name} (${state.intensity || '-'})`).join(', ')}`
                    : null,
            ].filter(Boolean);
            return fragments.join('\n');
        })
        .join('\n');
};

const buildCharacterPrompt = (request: CharacterImageRequest): string => {
    const { prompts } = usePromptStore.getState();
    const template = resolvePrompt(
        prompts,
        'CHARACTER_IMAGE_PROMPT',
        'imageGenerationService.buildCharacterPrompt'
    ).value;
    const characterSummary = summarizeCharacter(request.character, request.campaign);
    const personalityTraits = request.character.personalityTraits?.length
        ? request.character.personalityTraits.join(', ')
        : 'Traços não registrados.';
    const arcanaContext = describeArcana(request.arcanaContext);

    return template
        .replace('{character_summary}', characterSummary)
        .replace('{personality_traits}', personalityTraits)
        .replace('{arcana_context}', arcanaContext);
};

const buildScenePrompt = (request: SceneImageRequest): string => {
    const { prompts } = usePromptStore.getState();
    const template = resolvePrompt(
        prompts,
        'SCENE_IMAGE_PROMPT',
        'imageGenerationService.buildScenePrompt'
    ).value;
    const narration = request.narrationMessage.text || 'Descrição não fornecida.';
    const charactersBlock = summarizeCharactersInScene(request.charactersInScene);
    const arcanaMood = describeArcana(request.narrationMessage.cardDraw || request.scene.arcanaCardsDrawn);

    return template
        .replace('{scene_narration}', narration)
        .replace('{characters_in_scene}', charactersBlock)
        .replace('{arcana_mood}', arcanaMood);
};

const collectCharacterReferences = (characters: Character[]): ImageReference[] => {
    return characters
        .filter(character => Boolean(character.imageUrl))
        .map(character => ({ name: character.name, url: character.imageUrl }));
};

export interface CharacterImageRequest {
    campaign: Campaign;
    character: Character;
    arcanaContext?: ArcanaCardDraw;
}

export interface SceneImageRequest {
    campaign: Campaign;
    scene: Scene;
    narrationMessage: Message;
    charactersInScene: Character[];
}

export const generateCharacterPortrait = async (request: CharacterImageRequest): Promise<ImageGenerationResult> => {
    const prompt = buildCharacterPrompt(request);
    const references = request.character.imageUrl
        ? [{ name: request.character.name, url: request.character.imageUrl }]
        : [];
    const context: GenerationContext = {
        prompt,
        aspectRatio: '3:4',
        references,
        type: 'character',
        campaignId: request.campaign.id,
        storageMetadata: {
            characterId: request.character.id,
            characterName: request.character.name,
        },
    };

    const generation = await runImageGeneration(context);
    return persistResult(generation, context);
};

export const generateSceneIllustration = async (request: SceneImageRequest): Promise<ImageGenerationResult> => {
    const prompt = buildScenePrompt(request);
    const references = collectCharacterReferences(request.charactersInScene);
    const context: GenerationContext = {
        prompt,
        aspectRatio: '16:9',
        references,
        type: 'scene',
        campaignId: request.campaign.id,
        storageMetadata: {
            sceneId: request.scene.id,
            sceneTitle: request.scene.title,
            messageId: request.narrationMessage.id,
        },
    };

    const generation = await runImageGeneration(context);
    return persistResult(generation, context);
};

export const imageGenerationService = {
    generateCharacterPortrait,
    generateSceneIllustration,
};
