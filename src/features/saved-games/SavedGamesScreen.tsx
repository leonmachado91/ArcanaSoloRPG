// features/saved-games/SavedGamesScreen.tsx
// Este componente exibe a lista de campanhas salvas do usuário, permitindo
// que ele carregue uma aventura anterior ou apague campanhas indesejadas.

import React, { useState, useEffect, useCallback } from 'react';
import { Campaign } from '../../types/campaign';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import * as campaignService from '@/services/db/campaign.service';
import { formatErrorForDisplay } from '../../types/game';
import { useNavigationStore } from '@/store/navigationStore';
import { useErrorStore } from '@/store/errorStore';

const SavedGamesScreen: React.FC = () => {
    const { navigate, goBack } = useNavigationStore();
    const dispatch = useGameStore(state => state.dispatch);
    const { showError } = useErrorStore();
    const { username } = useAuthStore();
    
    const [campaigns, setCampaigns] = useState<(Partial<Campaign> & {last_played_at?: string})[]>([]);
    const [campaignToDelete, setCampaignToDelete] = useState<(Partial<Campaign> & {last_played_at?: string}) | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    /**
     * Busca a lista de campanhas do Supabase.
     */
    const refreshCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const savedCampaigns = await campaignService.listSavedCampaigns();
            setCampaigns(savedCampaigns);
        } catch (error) {
            const message = formatErrorForDisplay(error, "Não foi possível buscar as campanhas salvas.");
            showError(message);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    // Efeito que busca as campanhas quando o componente é montado.
    useEffect(() => {
        refreshCampaigns();
    }, [refreshCampaigns]);

    /**
     * Carrega uma campanha selecionada.
     */
    const handleLoadCampaign = async (campaignId: string) => {
        if (loadingCampaignId) return; 
        setLoadingCampaignId(campaignId);
        try {
            const loadedState = await campaignService.loadCampaign(campaignId);
            if (loadedState) {
                dispatch({ type: 'SET_GAME_STATE', payload: loadedState });
                navigate('game-room');
            } else {
                showError("Campanha não encontrada ou corrompida. Pode ter sido apagada.");
                refreshCampaigns();
            }
        } catch (error) {
            const message = formatErrorForDisplay(error, "Falha ao carregar a campanha.");
            showError(message);
        } finally {
            setLoadingCampaignId(null);
        }
    };
    
    /**
     * Confirma e executa a exclusão de uma campanha.
     */
    const handleConfirmDelete = async () => {
        if (!campaignToDelete?.id || isDeleting) return;
        
        setIsDeleting(true);
        try {
            await campaignService.deleteCampaign(campaignToDelete.id);
            setCampaignToDelete(null);
            await refreshCampaigns(); // Atualiza a lista após a exclusão
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Falha ao apagar a campanha.");
            showError(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * Componente para renderizar um único card de campanha na lista.
     */
    const CampaignCard: React.FC<{ campaign: Partial<Campaign> & {last_played_at?: string} }> = ({ campaign }) => (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:border-amber-500/50">
            <div>
                <h3 className="text-xl font-display text-white mb-2 flex items-center gap-2">
                    {campaign.title || 'Campanha Sem Título'}
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.genre && <span className="text-xs bg-zinc-700 text-slate-300 px-2 py-1 rounded">{campaign.genre}</span>}
                    {campaign.worldAdjective && <span className="text-xs bg-zinc-700 text-slate-300 px-2 py-1 rounded">{campaign.worldAdjective}</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-body-serif">
                    Jogada por último: {campaign.last_played_at ? new Date(campaign.last_played_at).toLocaleString('pt-BR') : 'Nunca'}
                </p>
            </div>
            <div className="flex items-center justify-between gap-2 mt-4">
                <Button 
                    variant="primary" 
                    className="flex-1 py-2 text-sm" 
                    onClick={() => handleLoadCampaign(campaign.id!)}
                    isLoading={loadingCampaignId === campaign.id}
                    disabled={!campaign.id || !!loadingCampaignId}
                >
                    Carregar
                </Button>
                <div className="flex gap-1">
                    <Button variant="ghost" className="p-2 text-red-500 hover:bg-red-500/10 hover:text-red-400" title="Apagar" onClick={() => setCampaignToDelete(campaign)} disabled={!campaign.id}>
                        <Icon name="trash" className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={goBack} className="p-2 -ml-2">
                        <Icon name="back" className="w-7 h-7" />
                    </Button>
                    <h1 className="text-4xl font-display text-white">Campanhas de {username}</h1>
                </div>
            </header>
            
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Spinner className="w-12 h-12" />
                </div>
            ) : campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-zinc-800 rounded-lg mt-8">
                    <Icon name="save" className="w-20 h-20 text-zinc-600 mb-4" />
                    <h2 className="text-2xl font-display text-white">Nenhuma Aventura Salva</h2>
                    <p className="text-slate-400 mt-2 mb-6 max-w-sm font-body-serif">Crie uma nova campanha para iniciar sua saga.</p>
                    <Button variant="primary" onClick={() => navigate('create-campaign')}>Criar Nova Campanha</Button>
                </div>
            )}

            <Modal
                isOpen={!!campaignToDelete}
                onClose={() => setCampaignToDelete(null)}
                title="Apagar Campanha"
                buttons={[
                    { label: 'Cancelar', onClick: () => setCampaignToDelete(null), variant: 'secondary', disabled: isDeleting },
                    { label: 'Confirmar Exclusão', onClick: handleConfirmDelete, variant: 'primary', className: 'bg-red-600 hover:bg-red-500 border-red-800 hover:border-red-700', isLoading: isDeleting }
                ]}
            >
                <p className="font-body-serif">Tem certeza que deseja apagar permanentemente a campanha "{campaignToDelete?.title}"? Esta ação não pode ser desfeita.</p>
            </Modal>
        </div>
    );
};

export default SavedGamesScreen;
