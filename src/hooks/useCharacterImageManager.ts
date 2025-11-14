// hooks/useCharacterImageManager.ts
import { useCallback, useMemo, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { Character } from '@/types/character';
import { Message } from '@/types/chat';
import { getConfig } from '@/services/configService';
import { createAppError, formatErrorForDisplay } from '@/types/game';
import { fileToDataUrl } from '@/utils/fileUtils';
import * as characterService from '@/services/db/character.service';
import { useErrorStore } from '@/store/errorStore';
import { logEvent } from '@/store/devLogStore';
import * as chatService from '@/services/db/chat.service';
import { imageGenerationService, ImageGenerationMetrics } from '@/services/ai/imageGenerationService';

type ImageJobStatus = 'queued' | 'processing' | 'success' | 'error';
type ImageJobAction = 'upload' | 'generate';
type ImageJobTarget = 'character' | 'message';

interface ImageJob {
    id: string;
    action: ImageJobAction;
    targetType: ImageJobTarget;
    targetId: string;
    label: string;
    status: ImageJobStatus;
    fileName?: string;
    error?: string;
    requestedAt: number;
    completedAt?: number;
    resultUrl?: string;
    metrics?: ImageGenerationMetrics;
    model?: string;
}

type JobReducerAction =
    | { type: 'enqueue'; job: ImageJob }
    | { type: 'update'; id: string; patch: Partial<ImageJob> };

const jobReducer = (state: ImageJob[], action: JobReducerAction): ImageJob[] => {
    switch (action.type) {
        case 'enqueue':
            return [action.job, ...state];
        case 'update':
            return state.map(job => (job.id === action.id ? { ...job, ...action.patch } : job));
        default:
            return state;
    }
};

/**
 * Hook `useCharacterImageManager`
 * Gerencia a lógica de upload e geração de imagens para os personagens e cenas.
 * @returns Um objeto contendo os estados e as funções de manipulação de imagem.
 */
export const useCharacterImageManager = () => {
    const dispatch = useGameStore(state => state.dispatch);
    const campaign = useGameStore(state => state.campaign);
    const playerCharacter = useGameStore(state => state.playerCharacter);
    const npcs = useGameStore(state => state.npcs);
    const { showError } = useErrorStore();
    const [jobs, jobDispatch] = useReducer(jobReducer, []);

    const enqueueJob = useCallback((jobInit: Omit<ImageJob, 'id' | 'status' | 'requestedAt'>): ImageJob => {
        const job: ImageJob = {
            ...jobInit,
            id: uuidv4(),
            status: 'queued',
            requestedAt: Date.now(),
        };
        jobDispatch({ type: 'enqueue', job });
        logEvent({
            type: 'system',
            message: '[Imagem] Job enfileirado',
            payload: { jobId: job.id, action: job.action, targetType: job.targetType, targetId: job.targetId, label: job.label },
        });
        return job;
    }, []);

    const updateJob = useCallback((id: string, patch: Partial<ImageJob>) => {
        jobDispatch({ type: 'update', id, patch });
    }, []);

    const markJobProcessing = useCallback((jobId: string) => {
        updateJob(jobId, { status: 'processing', error: undefined });
    }, [updateJob]);

    const markJobSuccess = useCallback((job: ImageJob, patch?: Partial<ImageJob>) => {
        updateJob(job.id, { status: 'success', completedAt: Date.now(), error: undefined, ...patch });
        logEvent({
            type: 'system',
            message: '[Imagem] Job concluído',
            payload: {
                jobId: job.id,
                action: job.action,
                targetType: job.targetType,
                targetId: job.targetId,
                metrics: patch?.metrics,
                resultUrl: patch?.resultUrl,
                model: patch?.model,
            },
        });
    }, [updateJob]);

    const markJobError = useCallback((job: ImageJob, errorMessage: string) => {
        updateJob(job.id, { status: 'error', completedAt: Date.now(), error: errorMessage });
        logEvent({
            type: 'system',
            message: '[Imagem] Job finalizado com erro',
            payload: { jobId: job.id, action: job.action, targetType: job.targetType, targetId: job.targetId, error: errorMessage },
        });
    }, [updateJob]);

    const characterJobStatuses = useMemo(() => {
        return jobs.reduce<Record<string, ImageJobStatus>>((acc, job) => {
            if (job.targetType !== 'character') {
                return acc;
            }

            if (job.status === 'queued' || job.status === 'processing') {
                acc[job.targetId] = job.status;
                return acc;
            }

            if (!acc[job.targetId]) {
                acc[job.targetId] = job.status;
            }
            return acc;
        }, {});
    }, [jobs]);

    const isCharacterBusy = useCallback((characterId: string) => {
        const status = characterJobStatuses[characterId];
        return status === 'queued' || status === 'processing';
    }, [characterJobStatuses]);

    const setMessageGeneratingState = useCallback(async (messageId: string, isGenerating: boolean) => {
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, data: { isGeneratingImage: isGenerating } } });
        try {
            await chatService.updateChatMessage(messageId, { isGeneratingImage: isGenerating });
        } catch (error) {
            console.warn('[useCharacterImageManager] Falha ao sincronizar estado de geração da mensagem.', error);
        }
    }, [dispatch]);

    const resolveSceneForMessage = useCallback((message: Message) => {
        const scenes = campaign.scenes || [];
        return scenes.find(scene => scene.id === message.sceneId)
            || scenes.find(scene => scene.isActive)
            || null;
    }, [campaign.scenes]);

    const resolveSceneForCharacter = useCallback((characterId: string) => {
        const scenes = campaign.scenes || [];
        return scenes.find(scene => scene.characterIds?.includes(characterId))
            || scenes.find(scene => scene.isActive)
            || null;
    }, [campaign.scenes]);

    const collectCharactersForScene = useCallback((scene: ReturnType<typeof resolveSceneForMessage>) => {
        if (!scene) {
            return [playerCharacter, ...npcs];
        }
        const ids = new Set(scene.characterIds || []);
        const list: Character[] = [];
        if (ids.has(playerCharacter.id)) {
            list.push(playerCharacter);
        }
        npcs.forEach(npc => {
            if (ids.has(npc.id)) {
                list.push(npc);
            }
        });
        if (list.length === 0) {
            list.push(playerCharacter);
        }
        return list;
    }, [npcs, playerCharacter]);

    /**
     * Gera uma arte para a mensagem do chat utilizando o serviço dedicado.
     */
    const handleGenerateImage = useCallback(async (message: Message) => {
        const job = enqueueJob({
            action: 'generate',
            targetType: 'message',
            targetId: message.id,
            label: `Gerar imagem para a mensagem ${message.id}`,
        });

        try {
            if (!campaign.id) {
                throw createAppError('VALIDATION_ERROR', 'Campanha inválida. Recarregue o jogo.', null, 'useCharacterImageManager.handleGenerateImage');
            }
            markJobProcessing(job.id);
            await setMessageGeneratingState(message.id, true);

            const scene = resolveSceneForMessage(message);
            if (!scene) {
                throw createAppError('VALIDATION_ERROR', 'Não foi possível identificar a cena desta mensagem.', { messageId: message.id }, 'useCharacterImageManager.handleGenerateImage');
            }

            const charactersInScene = collectCharactersForScene(scene);
            const result = await imageGenerationService.generateSceneIllustration({
                campaign,
                scene,
                narrationMessage: message,
                charactersInScene,
            });

            dispatch({ type: 'UPDATE_MESSAGE', payload: { id: message.id, data: { imageUrl: result.imageUrl } } });
            await chatService.updateChatMessage(message.id, { imageUrl: result.imageUrl });
            markJobSuccess(job, { resultUrl: result.imageUrl, metrics: result.metrics, model: result.modelUsed });
        } catch (error) {
            const friendly = formatErrorForDisplay(error, "Falha ao processar a geração de imagem da cena.");
            markJobError(job, friendly);
            showError(friendly);
        } finally {
            await setMessageGeneratingState(message.id, false);
        }
    }, [campaign, collectCharactersForScene, dispatch, enqueueJob, markJobError, markJobProcessing, markJobSuccess, resolveSceneForMessage, setMessageGeneratingState, showError]);
    
    /**
     * Gera uma nova arte para o retrato de um personagem via IA.
     */
    const handleGenerateCharacterImage = useCallback(async (character: Character) => {
        const job = enqueueJob({
            action: 'generate',
            targetType: 'character',
            targetId: character.id,
            label: `Gerar imagem para ${character.name || character.id}`,
        });

        try {
            if (!campaign.id) {
                throw createAppError('VALIDATION_ERROR', 'Campanha inválida. Recarregue o jogo.', null, 'useCharacterImageManager.handleGenerateCharacterImage');
            }
            markJobProcessing(job.id);

            const scene = resolveSceneForCharacter(character.id);
            const result = await imageGenerationService.generateCharacterPortrait({
                campaign,
                character,
                arcanaContext: scene?.arcanaCardsDrawn,
            });

            await characterService.updateCharacterData(character.id, { imageUrl: result.imageUrl });
            dispatch({
                type: 'UPDATE_CHARACTER_DATA',
                payload: { characterId: character.id, data: { imageUrl: result.imageUrl } }
            });
            markJobSuccess(job, { resultUrl: result.imageUrl, metrics: result.metrics, model: result.modelUsed });
        } catch (error) {
            const friendly = formatErrorForDisplay(error, "Falha ao gerar a imagem do personagem.");
            markJobError(job, friendly);
            showError(friendly);
        }
    }, [campaign, dispatch, enqueueJob, markJobError, markJobProcessing, markJobSuccess, resolveSceneForCharacter, showError]);
    
    /**
     * Manipula o upload de um arquivo de imagem para um personagem.
     * @param character O personagem para o qual a imagem está sendo enviada.
     * @param file O arquivo de imagem selecionado pelo usuário.
     */
    const handleUploadCharacterImage = useCallback(async (character: Character, file: File) => {
        const job = enqueueJob({
            action: 'upload',
            targetType: 'character',
            targetId: character.id,
            label: `Upload de imagem para ${character.name || character.id}`,
            fileName: file.name,
        });
        const config = getConfig();

        const sizeLimit = config.system.characterImageUploadSizeLimitMb;
        if (file.size > sizeLimit * 1024 * 1024) {
            const message = `A imagem é muito grande. O limite é de ${sizeLimit}MB.`;
            markJobError(job, message);
            showError(message);
            return;
        }

        try {
            markJobProcessing(job.id);
            const dataUrl = await fileToDataUrl(file);
            
            await characterService.updateCharacterData(character.id, { imageUrl: dataUrl });

            dispatch({
                type: 'UPDATE_CHARACTER_DATA',
                payload: { characterId: character.id, data: { imageUrl: dataUrl } }
            });

            markJobSuccess(job);
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Um erro desconhecido ocorreu ao fazer upload da imagem.");
            markJobError(job, errorMessage);
            showError(errorMessage);
        }
    }, [dispatch, enqueueJob, markJobProcessing, markJobSuccess, markJobError, showError]);

    return {
        imageJobs: jobs,
        isCharacterBusy,
        handleGenerateImage,
        handleGenerateCharacterImage,
        handleUploadCharacterImage,
    };
};
