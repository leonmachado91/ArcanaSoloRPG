// components/game/DiceRollDisplay.tsx
// Componente de UI para exibir uma solicitação de rolagem de dados e seu resultado.
// Ele gerencia dois estados principais: "pendente" (aguardando a ação do jogador)
// e "rolado" (exibindo o resultado do sucesso ou falha).

import React, { useState } from 'react';
import { DiceRoll } from '../../types/chat';
import Icon from '../ui/Icon';

interface DiceRollDisplayProps {
    /** O objeto com todos os dados da rolagem. */
    diceRoll: DiceRoll;
    /** Função de callback chamada quando o jogador clica para rolar os dados. */
    onRoll?: () => void;
    /** [FIX] Adicionado para determinar se a rolagem é do jogador. */
    isPlayerRoll?: boolean;
}

const DiceRollDisplay: React.FC<DiceRollDisplayProps> = ({ diceRoll, onRoll, isPlayerRoll = false }) => {
    const { testName, description, element, diceCount, difficulty, modifiers, status, result } = diceRoll;
    // Estado local para controlar a animação de "chacoalhar" os dados.
    const [isRolling, setIsRolling] = useState(false);
    
    // [BUG FIX] A lógica foi movida para uma prop `isPlayerRoll`. A verificação anterior
    // `characterId === 'player'` falhava após o ID do jogador ser atualizado para um UUID.
    
    // Mapeamento de cores para os elementos, para estilização visual.
    const elementColors = {
        fire: 'text-orange-400',
        water: 'text-cyan-400',
        air: 'text-slate-300',
        earth: 'text-green-400',
    };
    const elementText = element ? element.charAt(0).toUpperCase() + element.slice(1) : '';

    const title = testName || (element ? `Teste de ${elementText}` : 'Teste de Dificuldade');

    // Classes de estilo dinâmicas baseadas no resultado do sucesso ou falha.
    const resultColorClass = result?.success ? 'border-green-500/70' : 'border-red-500/70';
    const resultTextColorClass = result?.success ? 'text-green-400' : 'text-red-400';
    const resultShadowColor = result?.success ? 'shadow-green-500/60' : 'shadow-red-500/60';
    const resultText = result?.success ? 'SUCESSO' : 'FALHA';
    
    const containerGlowClass = result?.success 
        ? 'shadow-lg shadow-green-500/10' 
        : 'shadow-lg shadow-red-500/10';

    // Formata os modificadores para exibição.
    const modifierString = (mods: typeof modifiers) => (mods || []).map(mod => `${mod.value >= 0 ? '+' : ''}${mod.value} (${mod.description})`).join(' ');

    /**
     * Manipulador para o clique nos dados. Inicia a animação e chama o callback `onRoll`.
     */
    const handleRoll = () => {
        if (status === 'pending' && onRoll && !isRolling && isPlayerRoll) {
            setIsRolling(true);
            // O timeout simula o tempo que leva para os dados "rolarem" antes de mostrar o resultado.
            setTimeout(() => {
                onRoll();
                // O estado `isRolling` não precisa ser resetado aqui, pois o componente
                // será re-renderizado com o `status` 'rolled', removendo a UI de rolagem.
            }, 800); // Duração da animação de shake.
        }
    };

    return (
        <div className={`relative w-full max-w-md mx-auto my-6 p-6 bg-[#0E0E0E] border-2 rounded-xl text-center transition-all duration-300 ${status === 'rolled' ? `${resultColorClass} ${containerGlowClass}` : 'border-zinc-800/50'}`}>
            {element && <Icon name={element} className={`absolute top-4 right-4 w-8 h-8 ${elementColors[element]}`} />}

            <h3 className="font-display text-lg sm:text-xl uppercase tracking-wider text-white">
                {title}
            </h3>

            {difficulty !== undefined && (
                <p className="text-sm text-slate-400 font-bold tracking-wider mt-1">
                    DIFICULDADE: <span className="text-white">{difficulty}</span>
                </p>
            )}

            <div className="h-20 flex items-center justify-center my-4 px-4">
                <p className="text-slate-300 text-lg italic font-body-serif">"{description}"</p>
            </div>

            {/* Renderização condicional baseada no status da rolagem. */}
            {status === 'pending' ? (
                // Estado de espera: mostra os dados clicáveis.
                <>
                    <div 
                        className={`flex justify-center items-center gap-4 py-4 ${isPlayerRoll ? 'cursor-pointer group' : ''}`}
                        onClick={handleRoll}
                        role={isPlayerRoll ? "button" : undefined}
                        aria-label={isPlayerRoll ? `Rolar dados para: ${description}` : undefined}
                    >
                        {Array.from({ length: diceCount }).map((_, i) => (
                            <Icon 
                                key={i} 
                                name="dice" 
                                className={`w-16 h-16 sm:w-20 sm:h-20 text-zinc-600 ${isPlayerRoll ? 'group-hover:text-amber-400' : ''} transition-colors ${isRolling ? 'animate-shake' : ''}`}
                            />
                        ))}
                    </div>
                    <p className="text-slate-400 mt-2 h-6 text-sm">
                        {isPlayerRoll ? "Clique nos dados para rolar" : "Aguardando rolagem..."}
                    </p>
                </>
            ) : result && (
                // Estado rolado: mostra o resultado.
                <div className="py-4">
                    <h2 className={`font-display text-5xl my-2 font-bold tracking-[0.3em] ${resultTextColorClass} ${resultShadowColor} [text-shadow:0_0_15px_var(--tw-shadow-color)]`}>
                        {resultText}
                    </h2>
                    <p className={`text-7xl font-display font-bold my-1 ${resultTextColorClass}`}>{result.total}</p>
                    <p className="text-slate-400 mt-4 h-6 text-sm">
                         {result.rolls.join(' + ')} (Dados) {modifierString(modifiers)}
                    </p>
                </div>
            )}
        </div>
    );
};

export default DiceRollDisplay;