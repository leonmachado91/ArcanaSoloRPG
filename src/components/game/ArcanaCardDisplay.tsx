// components/game/ArcanaCardDisplay.tsx
// Este componente exibe uma única carta do Arcana com uma animação de "virar".
// Ele usa transformações 3D do CSS para criar o efeito de uma carta física sendo revelada.

import React, { useState, useEffect } from 'react';

const ArcanaCardDisplay: React.FC<{ label: string, word: string }> = ({ label, word }) => {
    // Estado para controlar se a carta está virada ou não.
    const [isFlipped, setIsFlipped] = useState(false);

    // `useEffect` para acionar a animação de virar a carta logo após ela ser montada na tela.
    useEffect(() => {
        // Um pequeno atraso garante que a transição CSS seja acionada corretamente.
        const timer = setTimeout(() => setIsFlipped(true), 100);
        return () => clearTimeout(timer);
    }, []);
    
    return (
        // O container `perspective` define a "profundidade" da cena 3D para a animação.
        <div className="w-full h-44 perspective-1000">
            {/* O `transform-style-3d` permite que os filhos se posicionem no espaço 3D. */}
            {/* A rotação é aplicada aqui com base no estado `isFlipped`. */}
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Verso da Carta: Visível por padrão. `backface-hidden` a esconde quando está virada. */}
                <div className="absolute w-full h-full backface-hidden bg-zinc-800 border-2 border-amber-500/30 rounded-lg flex flex-col items-center justify-center p-2">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-400/50 flex items-center justify-center">
                        <span className="font-display text-amber-400 text-2xl">A</span>
                    </div>
                </div>

                {/* Frente da Carta: Rotacionada 180 graus inicialmente e escondida. `backface-hidden` a revela quando o container gira. */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-zinc-900 border-2 border-slate-500/30 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                    <span className="font-display text-xl text-slate-200">{word}</span>
                     <span className="absolute bottom-1 right-2 font-display text-xs text-zinc-600 uppercase">{label}</span>
                </div>
            </div>
        </div>
    );
};


export default ArcanaCardDisplay;
