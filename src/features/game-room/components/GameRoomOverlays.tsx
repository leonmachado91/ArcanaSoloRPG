// features/game-room/components/GameRoomOverlays.tsx
// [Refatoração] Este componente foi extraído do GameRoomScreen para encapsular
// a lógica de renderização de todos os overlays (drawers e modais).

import React, { useState } from 'react';
import Drawer from '../../../components/ui/Drawer';
import CharacterSheet from '@/features/character-sheet/CharacterSheet';
import { Character } from '../../../types/character';
import { Campaign } from '../../../types/campaign';
import Button from '@/components/ui/Button';
import CharacterInScene from './CharacterInScene';

interface GameRoomOverlaysProps {
    isMenuOpen: boolean;
    setMenuOpen: (isOpen: boolean) => void;
    campaign: Campaign;

    selectedCharacter: Character | null;
    closeCharacterSheet: () => void;
    handleGenerateCharacterImage: (character: Character) => void;
    handleUploadCharacterImage: (character: Character, file: File) => void;
    generatingImageFor: string | null;
    playerCharacter: Character;
    openCharacterSheet: (character: Character) => void;
    npcsInScene: Character[];
}

const GameRoomOverlays: React.FC<GameRoomOverlaysProps> = ({
    isMenuOpen,
    setMenuOpen,
    campaign,
    selectedCharacter,
    closeCharacterSheet,
    handleGenerateCharacterImage,
    handleUploadCharacterImage,
    generatingImageFor,
    playerCharacter,
    openCharacterSheet,
    npcsInScene,
}) => {
    const [isNpcDrawerOpen, setIsNpcDrawerOpen] = useState(false);

    const handleOpenPlayerSheet = () => {
        openCharacterSheet(playerCharacter);
        setMenuOpen(false);
    };

    const handleOpenNpcDrawer = () => {
        setIsNpcDrawerOpen(true);
        setMenuOpen(false);
    };

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
                    <div className="md:hidden border-t border-zinc-800 pt-5">
                        <h4 className="text-white font-display text-lg mb-3">Acessos rápidos</h4>
                        <div className="space-y-3">
                            <Button className="w-full" onClick={handleOpenPlayerSheet}>
                                Ver ficha completa
                            </Button>
                            <Button variant="secondary" className="w-full" onClick={handleOpenNpcDrawer}>
                                Personagens em cena
                            </Button>
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

            <Drawer
                isOpen={isNpcDrawerOpen}
                onClose={() => setIsNpcDrawerOpen(false)}
                title="Personagens em Cena"
            >
                <div className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
                    <CharacterInScene
                        character={playerCharacter}
                        onClick={() => openCharacterSheet(playerCharacter)}
                    />
                    <hr className="border-zinc-800" />
                    {npcsInScene.length === 0 ? (
                        <p className="text-slate-400 text-sm">
                            Nenhum NPC está marcado como presente nesta cena.
                        </p>
                    ) : (
                        npcsInScene.map(character => (
                            <CharacterInScene
                                key={character.id}
                                character={character}
                                onClick={() => openCharacterSheet(character)}
                            />
                        ))
                    )}
                </div>
            </Drawer>
        </>
    );
};

export default GameRoomOverlays;
