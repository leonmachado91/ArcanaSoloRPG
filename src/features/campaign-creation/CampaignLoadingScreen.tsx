// features/campaign-creation/CampaignLoadingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import Spinner from '../../components/ui/Spinner';
import * as campaignService from '@/services/db/campaign.service';
import { formatErrorForDisplay }from '../../types/game';
import { useGameStore } from '@/store/useGameStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useErrorStore } from '@/store/errorStore';
import { logEvent } from '@/store/devLogStore';
import * as campaignGeneratorService from '@/services/ai/campaignGeneratorService';
import { useAppChrome } from '@/components/layout/AppChromeContext';

const CampaignLoadingScreen: React.FC = () => {
    const { navigate } = useNavigationStore();
    const { registerBackAction } = useAppChrome();
    const state = useGameStore();
    const { dispatch } = state;
    const { showError } = useErrorStore();
    
    const [loadingMessage, setLoadingMessage] = useState('Preparando sua aventura...');
    const hasStartedSetup = useRef(false);
    const hasStartedGeneration = useRef(false);

    // Effect to trigger the campaign finalization process once on mount
    useEffect(() => {
        if (hasStartedSetup.current) return;
        hasStartedSetup.current = true;
        
        logEvent({ type: 'system', message: 'Iniciando finalização da criação de campanha.' });
        dispatch({ type: 'FINISH_CAMPAIGN_SETUP' });

    }, [dispatch]);

    // Effect to react to state change (when IDs are assigned) and save the campaign
    useEffect(() => {
        const generateAndSaveCampaign = async () => {
            // Check if IDs have been assigned and we haven't already tried to save
            if (state.campaign.id && state.playerCharacter.id !== 'player' && !hasStartedGeneration.current) {
                hasStartedGeneration.current = true; // Mark as saving/saved to prevent re-entry
                try {
                    logEvent({ type: 'system', message: 'IDs gerados. Iniciando geração do mundo com a IA Arquiteta.' });

                    // Callback to update the loading message from the orchestrator
                    const onPhaseChange = (message: string) => {
                        setLoadingMessage(message);
                    };

                    // Gerar o mundo completo usando o novo serviço orquestrado
                    const populatedGameState = await campaignGeneratorService.generateAndPopulateCampaign(state, onPhaseChange);
                    logEvent({ type: 'system', message: 'IA Arquiteta concluiu a geração. Atualizando estado global.' });

                    // Atualizar o estado global com o mundo gerado
                    dispatch({ type: 'SET_GAME_STATE', payload: populatedGameState });
                    
                    // Salvar o estado completo no banco de dados
                    logEvent({ type: 'system', message: 'Salvando estado completo da campanha no banco de dados.' });
                    await campaignService.saveCampaign(populatedGameState);
                    
                    logEvent({ type: 'system', message: 'Campanha salva com sucesso. Navegando para a sala de jogo.' });

                    // Navigate to the game room after a short delay
                    setTimeout(() => {
                        navigate('game-room', { replace: true });
                    }, 1500);

                } catch (error) {
                    const errorMessage = formatErrorForDisplay(error, 'Falha crítica ao gerar o mundo da sua campanha.');
                    showError(errorMessage);
                    logEvent({ type: 'system', message: 'ERRO ao gerar ou salvar a campanha', payload: error });
                    // Navigate back on error
                    setTimeout(() => navigate('create-character', { replace: true }), 3000);
                }
            }
        };

        generateAndSaveCampaign();
    }, [state, dispatch, navigate, showError]);

    useEffect(() => {
        registerBackAction({
            icon: 'back',
            ariaLabel: 'Voltar para a criação de personagem',
            onAction: () => navigate('create-character', { replace: true }),
            variant: 'ghost',
        });
        return () => registerBackAction(null);
    }, [navigate, registerBackAction]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
            <Spinner className="w-16 h-16 text-amber-500" />
            <h1 className="text-4xl font-display text-white mt-8 animate-pulse">Forjando o Destino...</h1>
            <p className="text-slate-400 mt-4 text-lg font-body-serif transition-opacity duration-500">
                {loadingMessage}
            </p>
        </div>
    );
};

export default CampaignLoadingScreen;
