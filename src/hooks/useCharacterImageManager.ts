// hooks/useCharacterImageManager.ts
import { useCallback, useMemo, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { Character } from '@/types/character';
import { Message } from '@/types/chat';
import { getConfig } from '@/services/configService';
import { fileToDataUrl } from '@/utils/fileUtils';
import * as characterService from '@/services/db/character.service';
import { useErrorStore } from '@/store/errorStore';
import { logEvent } from '@/store/devLogStore';

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
    metrics?: Record<string, unknown>;
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

    const handleGenerateImage = useCallback(
        async (_message: Message) => {
            showError('A geração de imagens ainda não foi implementada nesta versão.');
        },
        [showError],
    );

    const handleGenerateCharacterImage = useCallback(
        async (_character: Character) => {
            showError('A geração de imagens ainda não foi implementada nesta versão.');
        },
        [showError],
    );
    
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
