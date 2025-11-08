// features/character-sheet/components/CharacterSheetAttributes.tsx
import React from 'react';
import { Character } from '@/types/character';
import TraitPill from './TraitPill';

interface CharacterSheetAttributesProps {
    character: Character;
}

const CharacterSheetAttributes: React.FC<CharacterSheetAttributesProps> = ({ character }) => {
    const { advantages, disadvantages } = character;
    return (
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-800">
            <div>
                <h4 className="font-bold text-green-400 mb-3 text-lg font-display">Vantagens</h4>
                <div className="flex flex-col items-start gap-2">
                    {advantages.length > 0 ? advantages.map(adv => <TraitPill key={adv} traitName={adv} tooltipAlign='left' />) : <p className="text-sm text-zinc-500 italic">Nenhuma.</p>}
                </div>
            </div>
             <div>
                <h4 className="font-bold text-red-400 mb-3 text-lg font-display">Desvantagens</h4>
                <div className="flex flex-col items-start gap-2">
                    {disadvantages.length > 0 ? disadvantages.map(dis => <TraitPill key={dis} traitName={dis} tooltipAlign='right' />) : <p className="text-sm text-zinc-500 italic">Nenhuma.</p>}
                </div>
            </div>
        </div>
    );
};

export default CharacterSheetAttributes;
