// features/character-creation/components/CharacterBasicInfoStep.tsx
import React from 'react';
import { Character } from '@/types/character';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { personalityTraitsOptions } from '@/data/rules/traits';

interface CharacterBasicInfoStepProps {
    character: Partial<Character>;
    onUpdate: (data: Partial<Character>) => void;
    onTogglePersonalityTrait: (trait: string) => void;
    customTraitInput: string;
    onCustomTraitInputChange: (value: string) => void;
    onAddCustomTrait: () => void;
}

const CharacterBasicInfoStep: React.FC<CharacterBasicInfoStepProps> = ({
    character,
    onUpdate,
    onTogglePersonalityTrait,
    customTraitInput,
    onCustomTraitInputChange,
    onAddCustomTrait,
}) => {
    const selectedTraits = character.personalityTraits || [];
    const unselectedStandardTraits = personalityTraitsOptions.filter(
        trait => !selectedTraits.includes(trait)
    );

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-display">Passo 1: Básico</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input label="Nome do Personagem" placeholder="Seu nome..." value={character.name || ''} onChange={e => onUpdate({ name: e.target.value })}/>
                <Input label="Idade" type="number" placeholder="Sua idade..." value={character.age || ''} onChange={e => onUpdate({ age: parseInt(e.target.value, 10) || 0 })}/>
                <div className="sm:col-span-2">
                    <Textarea label="Descrição Física" placeholder="Aparência, vestimentas, maneirismos..." value={character.description || ''} onChange={e => onUpdate({ description: e.target.value })} isResizable />
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Traços de Personalidade</label>
                    
                    {/* Traços selecionados (incluindo customizados) */}
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-zinc-900 rounded-lg min-h-[44px] border border-zinc-700">
                        {selectedTraits.length > 0 ? (
                            selectedTraits.map(trait => (
                                <button
                                    key={trait}
                                    onClick={() => onTogglePersonalityTrait(trait)}
                                    className="flex items-center gap-2 px-3 py-1 text-sm rounded-full border transition-colors font-semibold bg-slate-500 border-slate-400 text-white hover:bg-slate-600"
                                    title={`Remover "${trait}"`}
                                >
                                    {trait}
                                    <Icon name="close" className="w-3 h-3" />
                                </button>
                            ))
                        ) : (
                            <p className="text-sm text-zinc-500 italic px-2 py-1">Nenhum traço selecionado.</p>
                        )}
                    </div>
                    
                    {/* Sugestões de traços padrão */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {unselectedStandardTraits.map(trait => (
                            <button
                                key={trait}
                                onClick={() => onTogglePersonalityTrait(trait)}
                                className="px-3 py-1 text-sm rounded-full border transition-colors font-semibold bg-zinc-700 border-zinc-600 hover:bg-zinc-600"
                                title={`Adicionar "${trait}"`}
                            >
                                + {trait}
                            </button>
                        ))}
                    </div>

                    {/* Input para adicionar traço customizado */}
                    <div className="flex items-center gap-2 pt-4 border-t border-zinc-700/50">
                        <Input 
                            placeholder="Adicionar traço customizado..." 
                            value={customTraitInput} 
                            onChange={e => onCustomTraitInputChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddCustomTrait();
                                }
                            }}
                            className="flex-grow !p-2"
                        />
                        <Button variant="secondary" onClick={onAddCustomTrait} className="!px-4 !py-2.5" title="Adicionar Traço">
                            <Icon name="plus" className="w-5 h-5"/>
                        </Button>
                    </div>
                </div>
            </div>
             <Textarea label="História do Personagem" placeholder="Seu passado, suas motivações, o que te trouxe até aqui..." value={character.history || ''} onChange={e => onUpdate({ history: e.target.value })} isResizable />
        </div>
    );
};

export default CharacterBasicInfoStep;