// features/game-room/components/InitialObjectiveSetter.tsx
import React, { useState } from 'react';
import { Character } from '@/types/character';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';

interface InitialObjectiveSetterProps {
    playerCharacter: Character;
    isInputDisabled: boolean;
    handleStartGame: (objective: string) => void;
}

const InitialObjectiveSetter: React.FC<InitialObjectiveSetterProps> = ({
    playerCharacter,
    isInputDisabled,
    handleStartGame,
}) => {
    const [objectiveInput, setObjectiveInput] = useState(playerCharacter.objective || '');

    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-full max-w-xl bg-zinc-900/50 border border-zinc-800 rounded-lg p-8">
                <h2 className="text-2xl font-display text-amber-300">Seu Segredo</h2>
                <p className="text-slate-300 mt-2 mb-6 italic font-body-serif">"{playerCharacter.secret || 'Nenhum segredo definido.'}"</p>

                <Textarea
                    label="Seu Objetivo"
                    value={objectiveInput}
                    onChange={(e) => setObjectiveInput(e.target.value)}
                    placeholder="Defina o que seu personagem busca alcançar..."
                    className='text-center'
                    isResizable
                />

                <Button variant="primary" onClick={() => handleStartGame(objectiveInput)} isLoading={isInputDisabled} className="mt-6">
                    Iniciar Saga
                </Button>
            </div>
        </div>
    );
};

export default InitialObjectiveSetter;