// features/game-room/components/PlayerSummaryPanel.tsx
import React from 'react';
import CharacterSheet from '@/features/character-sheet/CharacterSheet';
import { Character } from '@/types/character';

interface PlayerSummaryPanelProps {
    playerCharacter: Character;
    onViewMore: (character: Character) => void;
    onGenerateImage: (character: Character) => void;
    onUploadImage: (character: Character, file: File) => void;
    isGeneratingImage: boolean;
}

const PlayerSummaryPanel: React.FC<PlayerSummaryPanelProps> = ({
    playerCharacter,
    onViewMore,
    onGenerateImage,
    onUploadImage,
    isGeneratingImage,
}) => {
    return (
        <aside className="hidden md:flex w-80 lg:w-96 flex-shrink-0 flex-col border-r border-zinc-800/50 bg-[#181818] overflow-y-auto overflow-x-hidden min-h-0">
            <CharacterSheet
                character={playerCharacter}
                variant="summary"
                onViewMore={() => onViewMore(playerCharacter)}
                onGenerateImage={onGenerateImage}
                onUploadImage={onUploadImage}
                isGeneratingImage={isGeneratingImage}
            />
        </aside>
    );
};

export default PlayerSummaryPanel;
