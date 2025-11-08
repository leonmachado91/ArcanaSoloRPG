// store/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AI_MODEL_CONFIG, AiTask } from '@/data/ai/models';
import { getConfig } from '@/services/configService';

type FontSize = 'small' | 'normal' | 'large';

interface SettingsState {
    fontSize: FontSize;
    highContrast: boolean;
    aiModels: Record<AiTask, string>;
    voice: string;
    isRawModeEnabled: boolean;
    _hydrated: boolean;
}

interface SettingsActions {
    setFontSize: (size: FontSize) => void;
    setHighContrast: (enabled: boolean) => void;
    setAiModel: (task: AiTask, model: string) => void;
    setVoice: (voiceName: string) => void;
    setIsRawModeEnabled: (enabled: boolean) => void;
}

const getDefaultSettings = (): Omit<SettingsState, '_hydrated'> => {
    const config = getConfig();
    return {
        fontSize: 'small',
        highContrast: false,
        aiModels: config.ai.defaults,
        voice: config.ai.defaultMasterVoice,
        isRawModeEnabled: false,
    };
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
    persist(
        (set) => ({
            ...getDefaultSettings(),
            _hydrated: false, // Inicia como não hidratado
            setFontSize: (size) => set({ fontSize: size }),
            setHighContrast: (enabled) => set({ highContrast: enabled }),
            setAiModel: (task, model) => set((state) => ({
                aiModels: { ...state.aiModels, [task]: model },
            })),
            setVoice: (voiceName) => set({ voice: voiceName }),
            setIsRawModeEnabled: (enabled) => set({ isRawModeEnabled: enabled }),
        }),
        {
            name: 'arcana_rpg_settings', // Chave do localStorage
            onRehydrateStorage: () => {
                // Listener que é chamado uma vez que a hidratação está completa.
                return (state, error) => {
                    if (error) {
                        console.warn("Falha ao hidratar as configurações, usando padrão.", error);
                    } else if (state) {
                        // Quando a reidratação é bem-sucedida, define a flag.
                        // Esta modificação será mesclada ao estado da store pelo middleware.
                        state._hydrated = true;
                    }
                }
            }
        }
    )
);