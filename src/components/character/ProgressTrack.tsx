// components/character/ProgressTrack.tsx
// Este componente de UI visualiza a Trilha de Progresso de um personagem.
// Ele recebe um array de 10 números e renderiza 10 "caixas", cada uma
// preenchida com até 4 "pips" (pequenos retângulos) para representar os pontos.

import React from 'react';

interface ProgressTrackProps {
    /** O total de pontos de progresso do personagem. */
    progressPoints: number;
}

const ProgressTrack: React.FC<ProgressTrackProps> = ({ progressPoints }) => {
    // Calcula o array visual da trilha com base no total de pontos.
    const track = Array(10).fill(0).map((_, i) => 
        Math.min(4, Math.max(0, progressPoints - i * 4))
    );

    return (
        <div>
            <h4 className="font-bold text-xs text-slate-400 tracking-wider uppercase mb-2">Trilha de Progresso</h4>
            <div className="flex items-center gap-1.5">
                {/* Mapeia o array `track` para criar 10 caixas de progresso. */}
                {track.map((boxValue, boxIndex) => (
                    <div
                        key={boxIndex}
                        className="flex-1 bg-zinc-900 rounded-md p-1.5 flex flex-col-reverse justify-start gap-1 border border-zinc-800 h-12"
                    >
                        {/* Dentro de cada caixa, cria 4 "pips". */}
                        {Array.from({ length: 4 }).map((_, pipIndex) => (
                            <div
                                key={pipIndex}
                                // O pip é colorido se seu índice for menor que o valor da caixa.
                                className={`h-1.5 w-full rounded-sm transition-colors ${
                                    pipIndex < boxValue ? 'bg-amber-500' : 'bg-zinc-700'
                                }`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProgressTrack;