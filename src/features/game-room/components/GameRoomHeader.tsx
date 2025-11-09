import React from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import SaveStatusIndicator from './SaveStatusIndicator';

interface GameRoomHeaderProps {
    campaignTitle: string;
    currentLocationName?: string | null;
    isSaving: boolean;
    onOpenCampaignPanel: () => void;
}

/**
 * Cabeçalho da Sala de Jogo.
 * Mantém título, localização atual e atalhos para abrir o painel geral da campanha.
 */
const GameRoomHeader: React.FC<GameRoomHeaderProps> = ({
    campaignTitle,
    currentLocationName,
    isSaving,
    onOpenCampaignPanel,
}) => {
    return (
        <header className="relative flex-shrink-0 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50 px-4 py-3 z-10">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                    variant="ghost"
                    className="p-2"
                    onClick={onOpenCampaignPanel}
                    title="Painel da Campanha"
                >
                    <Icon name="list-alt" className="w-6 h-6" />
                </Button>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-lg font-display text-white uppercase tracking-widest">
                    {campaignTitle}
                </h1>
                <div className="flex items-center gap-3 text-sm text-amber-300/80">
                    {currentLocationName && (
                        <div className="flex items-center gap-2">
                            <span>{currentLocationName}</span>
                            <div className="w-px h-4 bg-zinc-700" />
                        </div>
                    )}
                    <SaveStatusIndicator isSaving={isSaving} />
                </div>
            </div>
        </header>
    );
};

export default GameRoomHeader;
