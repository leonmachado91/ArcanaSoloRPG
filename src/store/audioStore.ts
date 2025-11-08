// store/audioStore.ts
import { create } from 'zustand';
import * as audioService from '@/services/audioService';
import { getVoiceForCharacter } from '@/data/ai/voices';
import { useSettingsStore } from './settingsStore';
import { Character } from '@/types/character';
import { useErrorStore } from './errorStore';
import { Message } from '@/types/chat';
import { useGameStore } from './useGameStore';
import { formatErrorForDisplay } from '@/types/game';
import { decodeBase64, decodePcmData } from '@/utils/audioUtils';

interface AudioState {
    isPlaying: boolean;
    isLoading: boolean;
    currentMessageId: string | null;
}

interface AudioActions {
    playAudio: (message: Message) => void;
    stopAudio: () => void;
}

// --- Variáveis de escopo para gerenciar a Web Audio API (efeitos colaterais) ---
let audioContextInstance: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;

const getAudioContext = () => {
    if (!audioContextInstance) {
        // @ts-ignore - Fallback for older browsers
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioContextInstance = new AudioContext({ sampleRate: 24000 });
        }
    }
    return audioContextInstance;
};
// --- Fim das variáveis de escopo ---

export const useAudioStore = create<AudioState & AudioActions>((set, get) => ({
    isPlaying: false,
    isLoading: false,
    currentMessageId: null,

    stopAudio: () => {
        if (sourceNode) {
            sourceNode.stop();
            sourceNode.disconnect();
            sourceNode = null;
        }
        set({ isPlaying: false, isLoading: false, currentMessageId: null });
    },

    playAudio: async (message) => {
        const { showError } = useErrorStore.getState();
        const { dispatch } = useGameStore.getState();
        const settings = useSettingsStore.getState();

        const audioCtx = getAudioContext();
        if (!audioCtx) {
            showError("A API de Áudio Web não é suportada neste navegador.");
            return;
        }

        if (get().isLoading) return;
        if (get().isPlaying && get().currentMessageId === message.id) {
            get().stopAudio();
            return;
        }
        
        get().stopAudio();

        if (!message.text || !message.text.trim()) {
            showError("Não há texto para narrar.");
            return;
        }

        // --- Lógica de Cache ---
        if (message.audioData) {
            set({ isPlaying: false, isLoading: false, currentMessageId: message.id });
            await playDecoded(message.audioData, message.id, set, get);
            return;
        }

        // --- Geração de Novo Áudio ---
        set({ isPlaying: false, isLoading: true, currentMessageId: message.id });

        try {
            const isMasterOrSystem = message.authorId === 'master' || message.authorId === 'system';
            const voice = isMasterOrSystem ? settings.voice : getVoiceForCharacter(message.author as Character);

            const { audioBase64 } = await audioService.generateAudio(message, voice, settings.aiModels.audioGeneration);
            
            dispatch({
                type: 'UPDATE_MESSAGE',
                payload: { id: message.id, data: { audioData: audioBase64 } }
            });
            
            await playDecoded(audioBase64, message.id, set, get);

        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Falha ao gerar ou reproduzir áudio.");
            showError(errorMessage);
            set({ isPlaying: false, isLoading: false, currentMessageId: null });
        }
    },
}));


/**
 * Função auxiliar para decodificar e tocar áudio PCM.
 */
const playDecoded = async (
    audioBase64: string, 
    messageId: string, 
    set: (state: Partial<AudioState>) => void,
    get: () => AudioState & AudioActions
) => {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    try {
        const pcmData = decodeBase64(audioBase64);
        const audioBuffer = await decodePcmData(pcmData, audioCtx);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
            if (sourceNode === source) {
                get().stopAudio();
            }
        };

        source.start(0);
        sourceNode = source;
        set({ isPlaying: true, isLoading: false, currentMessageId: messageId });
    } catch (error) {
        console.error("Erro ao decodificar e tocar áudio:", error);
        useErrorStore.getState().showError("Falha ao processar o áudio para reprodução.");
        get().stopAudio();
    }
};
