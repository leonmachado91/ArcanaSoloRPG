// features/game-room/components/NpcsInScenePanel.tsx
import React from 'react';
import { Character } from '@/types/character';
import CharacterInScene from './CharacterInScene';

interface NpcsInScenePanelProps {
    playerCharacter: Character;
    npcsInScene: Character[];
    onCharacterClick: (character: Character) => void;
}

const NpcsInScenePanel: React.FC<NpcsInScenePanelProps> = ({
    playerCharacter,
    npcsInScene,
    onCharacterClick,
}) => {
    return (
        <aside className="hidden lg:flex w-72 xl:w-80 flex-shrink-0 flex-col border-l border-zinc-800/50 bg-[#181818] p-4 space-y-3 overflow-y-auto overflow-x-hidden min-h-0">
            <h2 className='font-display text-xl text-center pb-2 border-b border-zinc-700'>Personagens em Cena</h2>

            <CharacterInScene
                character={playerCharacter}
                onClick={() => onCharacterClick(playerCharacter)}
            />

            <hr className="border-zinc-700/50" />

            {npcsInScene.map(char => (
                <CharacterInScene
                    key={char.id}
                    character={char}
                    onClick={() => onCharacterClick(char)}
                />
            ))}
        </aside>
    );
};

export default NpcsInScenePanel;
