// hooks/useGameRoom.ts
// Este hook customizado atua como um ORQUESTRADOR para a tela `GameRoomScreen`.
// Sua única responsabilidade é compor outros hooks especializados (UI, Ações, Imagem)
// e fornecer um conjunto unificado de estados e funções para o componente de UI.

import { useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useGameUI } from './useGameUI';
import { useGameActions } from './useGameActions';
import { useCharacterImageManager } from './useCharacterImageManager';
import * as narratorService from '@/services/ai/narratorService';
import { useErrorStore } from '@/store/errorStore';
import { formatErrorForDisplay } from '@/types/game';
import { useSettingsStore } from '@/store/settingsStore';
import { logEvent } from '@/store/devLogStore';
import * as sceneService from '@/services/db/scene.service';

/**
 * Hook `useGameRoom`
 * Gerencia o estado e as interações da UI para a tela `GameRoomScreen`.
 * @returns Um objeto contendo o estado necessário para renderizar a UI e as funções
 * de callback para manipular os eventos do usuário.
 */
export const useGameRoom = () => {
    // Hook de UI: gerencia todos os estados de modais, painéis, seleções, etc.
    const uiState = useGameUI();
    const { selectedCharacterId } = uiState;

    const { showError } = useErrorStore();
    const sessionInitializedForCampaign = useRef<string | null>(null);
    const isSettingsHydrated = useSettingsStore(state => state._hydrated);

    // Seletores granulares do Zustand para otimizar re-renderizações.
    const playerCharacter = useGameStore(state => state.playerCharacter);
    const npcs = useGameStore(state => state.npcs);
    const campaign = useGameStore(state => state.campaign);
    const isMasterThinking = useGameStore(state => state.isMasterThinking);
    const isSaving = useGameStore(state => state.isSaving);
    const chatHistory = useGameStore(state => state.campaign.chatHistory);
    const campaignId = useGameStore(state => state.campaign.id);

    // Efeito para inicializar a sessão de chat da IA Mestre.
    // É executado sempre que uma nova campanha é carregada na sala de jogo.
    useEffect(() => {
        // Só inicializa se as configurações foram carregadas (hydration), 
        // se tivermos um ID de campanha e for uma campanha para a qual 
        // ainda não inicializamos a sessão.
        if (isSettingsHydrated && campaignId && sessionInitializedForCampaign.current !== campaignId) {
            sessionInitializedForCampaign.current = campaignId;
            
            const initializeSession = async () => {
                try {
                    // Obtém o estado completo no momento da inicialização
                    let currentState = useGameStore.getState();
                    const activeScene = currentState.campaign.scenes?.find(s => s.isActive);

                    // VERIFICAÇÃO DE CONSISTÊNCIA: Garante que o jogador esteja sempre na cena ativa.
                    if (activeScene && !activeScene.characterIds?.includes(currentState.playerCharacter.id)) {
                        console.warn(`[useGameRoom] Correção de Inconsistência: Personagem do jogador (ID: ${currentState.playerCharacter.id}) não encontrado na cena ativa (ID: ${activeScene.id}). Adicionando-o.`);
                        logEvent({
                            type: 'system',
                            message: `Correção de Inconsistência: Personagem do jogador não encontrado na cena ativa. Adicionando-o.`,
                            payload: { sceneId: activeScene.id, playerId: currentState.playerCharacter.id }
                        });
                        
                        const updatedCharacterIds = Array.from(new Set([...(activeScene.characterIds || []), currentState.playerCharacter.id]));
                        
                        // 1. Persiste a correção no banco de dados.
                        await sceneService.updateSceneData(activeScene.id, { characterIds: updatedCharacterIds });
                        
                        // 2. Atualiza o estado local.
                        useGameStore.getState().dispatch({
                            type: 'UPDATE_SCENE_CHARACTERS',
                            payload: { sceneId: activeScene.id, characterIds: updatedCharacterIds }
                        });

                        // 3. Pega o estado mais recente após a correção para inicializar a IA.
                        currentState = useGameStore.getState();
                    }
                    
                    await narratorService.initializeChatSession(currentState);
                } catch (error) {
                    const errorMessage = formatErrorForDisplay(
                        error, 
                        "Falha crítica ao inicializar a sessão de jogo. A narração pode não funcionar."
                    );
                    showError(errorMessage);
                }
            };
            initializeSession();
        }
    }, [isSettingsHydrated, campaignId, showError]);

    const isInputDisabled = isMasterThinking;
    
    const isGameStarted = chatHistory.length > 0;

    // Combina todos os personagens em uma única lista para facilitar buscas.
    const allCharacters = useMemo(() => [playerCharacter, ...npcs], [playerCharacter, npcs]);

    // Hook de Ações: gerencia todas as funções de interação do jogador.
    const actions = useGameActions(allCharacters);

    // Hook de Imagem: gerencia a lógica de upload e geração de imagens.
    const imageManager = useCharacterImageManager();

    // `useMemo` para encontrar o objeto completo do personagem selecionado.
    // Isso evita buscas repetitivas no array de personagens a cada renderização.
    const selectedCharacter = useMemo(() => {
        if (!selectedCharacterId) return null;
        if (selectedCharacterId === playerCharacter.id) {
            return playerCharacter;
        }
        return npcs.find(c => c.id === selectedCharacterId);
    }, [selectedCharacterId, playerCharacter, npcs]);
    
    return {
        // Estado do Jogo (do Zustand)
        playerCharacter,
        npcs,
        campaign,
        chatHistory,
        isInputDisabled,
        isGameStarted,
        isSaving,
        isMasterThinking,
        
        // Estado da UI (do hook `useGameUI`)
        ...uiState,
        selectedCharacter, // Adiciona o objeto de personagem calculado
        
        // Ações (do hook `useGameActions`)
        ...actions,

        // Lógica de imagem (do hook `useCharacterImageManager`)
        ...imageManager,
    };
};
