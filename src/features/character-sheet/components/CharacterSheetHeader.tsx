// features/character-sheet/components/CharacterSheetHeader.tsx
import React from 'react';
import { Character } from '@/types/character';
import Icon from '@/components/ui/Icon';
import CharacterImageActions from './CharacterImageActions';

interface CharacterSheetHeaderProps {
    character: Character;
    onGenerateImage?: (character: Character) => void;
    onUploadImage?: (character: Character, file: File) => void;
    isGeneratingImage?: boolean;
}

const CharacterSheetHeader: React.FC<CharacterSheetHeaderProps> = ({ character, onGenerateImage, onUploadImage, isGeneratingImage }) => {
    const { name, age, description, imageUrl, personalityTraits } = character;
    return (
        <header className="flex items-start gap-6">
            <div className="relative w-32 h-32 rounded-lg border-4 border-amber-500/50 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <Icon 
                        name={character.type === 'player' ? "player" : "companion"} 
                        className={`w-16 h-16 ${character.type === 'player' ? 'text-amber-400' : 'text-slate-400'}`}
                    />
                )}
                {(onGenerateImage || onUploadImage) && !imageUrl && (
                    <div className="absolute -bottom-2 -right-2">
                         <CharacterImageActions 
                            character={character}
                            onGenerateImage={onGenerateImage}
                            onUploadImage={onUploadImage}
                            isGeneratingImage={isGeneratingImage}
                            buttonSizeClass="w-10 h-10"
                            iconSizeClass="w-5 h-5"
                         />
                    </div>
                )}
            </div>
            <div>
                <h2 className="text-4xl font-display text-white">{name}</h2>
                <p className="text-md text-slate-400 font-body-serif">{age} anos</p>
                <p className="mt-2 text-slate-300 font-body-serif">{description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    {(personalityTraits || []).map(trait => (
                        <span key={trait} className="bg-zinc-700 text-slate-300 text-sm font-semibold px-3 py-1 rounded-full">
                            {trait}
                        </span>
                    ))}
                </div>
            </div>
        </header>
    );
}

export default CharacterSheetHeader;
