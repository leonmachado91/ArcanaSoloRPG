// features/game-room/components/PlayerSummaryPanel.tsx
import React from 'react';
import CharacterSheet from '@/features/character-sheet/CharacterSheet';
import { Character } from '@/types/character';

interface PlayerSummaryPanelProps {
    playerCharacter: Character;
    onViewMore: (character: Character) => void;
    onGenerateImage: (character: Character) => void;
    onUploadImage: (character: Character, file: File) => void;
    generatingImageFor: string | null;
}

const PlayerSummaryPanel: React.FC<PlayerSummaryPanelProps> = ({
    playerCharacter,
    onViewMore,
    onGenerateImage,
    onUploadImage,
    generatingImageFor,
}) => {
    return (
        <aside className="hidden md:block w-80 lg:w-96 flex-shrink-0 border-r border-zinc-800/50 bg-[#181818]">
            <CharacterSheet
                character={playerCharacter}
                variant="summary"
                onViewMore={() => onViewMore(playerCharacter)}
                onGenerateImage={onGenerateImage}
                onUploadImage={onUploadImage}
                isGeneratingImage={generatingImageFor === playerCharacter.id}
            />
        </aside>
    );
};

export default PlayerSummaryPanel;