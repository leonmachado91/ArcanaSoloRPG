// features/game-room/components/GameRoomOverlays.tsx
// [Refatoração] Este componente foi extraído do GameRoomScreen para encapsular
// a lógica de renderização de todos os overlays (drawers e modais).

import React from 'react';
import Drawer from '../../../components/ui/Drawer';
import Modal from '../../../components/ui/Modal';
import CharacterSheet from '@/features/character-sheet/CharacterSheet';
import SettingsDrawer from '../../../components/settings/SettingsDrawer';
import DevLogDrawer from '@/features/dev-log/DevLogDrawer';
import { Character } from '../../../types/character';
import { Campaign } from '../../../types/campaign';

interface GameRoomOverlaysProps {
    isMenuOpen: boolean;
    setMenuOpen: (isOpen: boolean) => void;
    campaign: Campaign;

    selectedCharacter: Character | null;
    closeCharacterSheet: () => void;
    handleGenerateCharacterImage: (character: Character) => void;
    handleUploadCharacterImage: (character: Character, file: File) => void;
    generatingImageFor: string | null;

    isExitModalOpen: boolean;
    setIsExitModalOpen: (isOpen: boolean) => void;
    handleExit: () => void;

    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
    
    isDevLogOpen: boolean;
    setIsDevLogOpen: (isOpen: boolean) => void;
    onReplayAction: (action: string, isOff?: boolean) => void;
}

const GameRoomOverlays: React.FC<GameRoomOverlaysProps> = ({
    isMenuOpen, setMenuOpen, campaign,
    selectedCharacter, closeCharacterSheet, handleGenerateCharacterImage, handleUploadCharacterImage, generatingImageFor,
    isExitModalOpen, setIsExitModalOpen, handleExit,
    isSettingsOpen, setIsSettingsOpen,
    isDevLogOpen, setIsDevLogOpen, onReplayAction
}) => {
    return (
        <>
            {/* Drawers e Modais: Renderizados no nível superior para sobrepor toda a tela. */}
            <Drawer isOpen={isMenuOpen} onClose={() => setMenuOpen(false)} title="Painel da Campanha" size="large">
                 <div className="space-y-8">
                     <div>
                        <h3 className="text-xl font-display text-white mb-4">Informações da Campanha</h3>
                         <div className="space-y-2 text-slate-300 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 font-body-serif">
                             <p><strong className="text-white font-sans">Gênero:</strong> {campaign.genre}</p>
                             <p><strong className="text-white font-sans">Adjetivo:</strong> {campaign.worldAdjective}</p>
                             <p><strong className="text-white font-sans">Local:</strong> {campaign.location}</p>
                             <p><strong className="text-white font-sans">Época:</strong> {campaign.era}</p>
                             <h4 className="font-bold text-lg pt-3 border-t border-zinc-700 mt-3 font-sans">Declarações</h4>
                             <ul className="list-disc list-inside space-y-1 pl-2">
                                 {campaign.declarations.map((dec, i) => <li key={i}>{dec}</li>)}
                             </ul>
                         </div>
                    </div>
                 </div>
            </Drawer>

            <Drawer isOpen={!!selectedCharacter} onClose={closeCharacterSheet} title="Ficha de Personagem" size="large">
                {selectedCharacter && <CharacterSheet 
                    character={selectedCharacter} 
                    variant="full" 
                    onGenerateImage={handleGenerateCharacterImage}
                    onUploadImage={handleUploadCharacterImage}
                    isGeneratingImage={generatingImageFor === selectedCharacter.id}
                />}
            </Drawer>
            
            <Modal
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                title="Sair da Campanha"
                buttons={[
                    { label: 'Ficar', onClick: () => setIsExitModalOpen(false), variant: 'secondary' },
                    { label: 'Sair', onClick: handleExit, variant: 'primary', className: 'bg-red-600 hover:bg-red-500 border-red-800 hover:border-red-700' }
                ]}
            >
                <p className="font-body-serif">Deseja retornar ao menu principal? Seu progresso é salvo automaticamente na nuvem.</p>
            </Modal>

            <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <DevLogDrawer isOpen={isDevLogOpen} onClose={() => setIsDevLogOpen(false)} onReplayAction={onReplayAction} />
        </>
    );
};

export default GameRoomOverlays;
