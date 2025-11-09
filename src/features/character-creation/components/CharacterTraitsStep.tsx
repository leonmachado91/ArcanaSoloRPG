// features/character-creation/components/CharacterTraitsStep.tsx
import React from 'react';
import { Character, GroupedTraits } from '@/types/character';
import Spinner from '@/components/ui/Spinner';
import Icon from '@/components/ui/Icon';
import TraitButton from '@/components/character/TraitButton';

interface CharacterTraitsStepProps {
    character: Partial<Character>;
    groupedTraits: GroupedTraits | null;
    isLoading: boolean;
    error: Error | null;
    advantagePoints: number;
    usedAdvantagePoints: number;
    onToggleTrait: (traitName: string, type: 'advantages' | 'disadvantages') => void;
}

const CharacterTraitsStep: React.FC<CharacterTraitsStepProps> = ({
    character,
    groupedTraits,
    isLoading,
    error,
    advantagePoints,
    usedAdvantagePoints,
    onToggleTrait,
}) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <Spinner className="w-12 h-12 text-amber-500" />
                <p className="mt-4 text-slate-400">Carregando Vantagens e Desvantagens...</p>
            </div>
        );
    }

    if (error || !groupedTraits) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Icon name="close" className="w-12 h-12 text-red-500" />
                <p className="mt-4 text-red-400 max-w-md">Não foi possível carregar os dados de personagem. Verifique o console de erros para mais detalhes.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold font-display text-center mb-6">Vantagens & Desvantagens</h2>
            </div>
            <div className="pt-8 border-t border-zinc-700">
                <p className="text-center text-sm text-slate-400 mb-6 font-body-serif">Para cada Desvantagem, você ganha 1 ponto para uma Vantagem.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <h3 className={`font-bold mb-3 ${usedAdvantagePoints > advantagePoints ? 'text-yellow-400' : 'text-green-400'}`}>
                            Vantagens ({usedAdvantagePoints}/{advantagePoints})
                        </h3>
                        <div className="space-y-4">
                            {Object.keys(groupedTraits.advantages).map((element) => (
                                <div key={element}>
                                    <h4 className="font-semibold text-sm text-slate-300 mb-2">{element}</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {groupedTraits.advantages[element].map(adv => {
                                            const isSelected = (character.advantages || []).includes(adv.name);
                                            const isDisabled = !isSelected && usedAdvantagePoints >= advantagePoints;
                                            return <TraitButton key={adv.name} trait={adv} type="advantage" isSelected={isSelected} onClick={() => onToggleTrait(adv.name, 'advantages')} disabled={isDisabled} />
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-red-400 mb-3">Desvantagens ({advantagePoints})</h3>
                        <div className="space-y-4">
                            {Object.keys(groupedTraits.disadvantages).map((element) => (
                                <div key={element}>
                                    <h4 className="font-semibold text-sm text-slate-300 mb-2">{element}</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {groupedTraits.disadvantages[element].map(dis => {
                                            const isSelected = (character.disadvantages || []).includes(dis.name);
                                            const isDisabled = isSelected && usedAdvantagePoints > (advantagePoints - 1);
                                            return <TraitButton key={dis.name} trait={dis} type="disadvantage" isSelected={isSelected} onClick={() => onToggleTrait(dis.name, 'disadvantages')} disabled={isDisabled} />
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterTraitsStep;
