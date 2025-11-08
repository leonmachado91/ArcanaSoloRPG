// components/game/CombatClashDisplay.tsx
import React, { useState, useEffect } from 'react';
import { DiceRoll } from '../../types/chat';
import { Character, Element as ElementType, DamageSeverity } from '../../types/character';
import Icon from '../ui/Icon';

interface CombatClashDisplayProps {
    diceRoll: DiceRoll;
    attacker: Character;
    defender: Character;
    onRoll?: () => void;
}

const elementColors: Record<ElementType, string> = {
    fire: 'text-orange-400',
    water: 'text-cyan-400',
    air: 'text-slate-300',
    earth: 'text-green-400',
};

// FIX: Extracted FrameContent props into an interface for better type safety and reusability.
interface FrameContentProps {
    character: Character;
    role: 'Atacante' | 'Defensor';
    element: ElementType;
    diceCount: number;
    resultTotal?: number;
    rawRollTotal?: number;
    modifierTotal?: number;
    rolls?: number[];
    isPlayerSide: boolean;
    isPending: boolean;
    isRolling: boolean;
    onClick?: () => void;
    isWinner: boolean;
    isTie: boolean;
}

const FrameContent: React.FC<FrameContentProps> = ({ character, role, element, diceCount, resultTotal = 0, rawRollTotal = 0, modifierTotal = 0, rolls = [], isPlayerSide, isPending, isRolling, onClick, isWinner, isTie }) => (
    <div className="w-full h-full flex flex-col items-center justify-between p-4">
        <div className="text-center">
            <div className="flex items-center justify-center gap-2">
                <Icon name={element} className={`w-4 h-4 ${elementColors[element]}`} />
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{role}</p>
            </div>
            <h4 className="text-xl font-display text-white">{character.name}</h4>
        </div>
        
        <div className="w-20 h-20 my-2 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center flex-shrink-0">
            {character.imageUrl ? (
                <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover rounded-full" />
            ) : (
                <Icon 
                    name={character.type === 'player' ? "player" : "companion"} 
                    className={`w-10 h-10 ${character.type === 'player' ? 'text-amber-400' : 'text-slate-400'}`}
                />
            )}
        </div>

        <div className="flex-grow flex flex-col items-center justify-center">
            {isPending ? (
                 <div 
                    className={`flex justify-center items-center gap-2 ${isPlayerSide ? 'cursor-pointer group' : ''}`}
                    onClick={onClick}
                 >
                    {Array.from({ length: diceCount }).map((_, i) => (
                        <Icon 
                            key={i} 
                            name="dice" 
                            className={`w-14 h-14 text-zinc-600 ${isPlayerSide ? 'group-hover:text-amber-400' : ''} transition-colors ${isRolling && isPlayerSide ? 'animate-shake' : ''}`}
                        />
                    ))}
                </div>
            ) : (
                <>
                    <p className={`font-display text-7xl font-bold ${isTie ? 'text-slate-300' : isWinner ? 'text-green-400' : 'text-red-400'}`}>{resultTotal}</p>
                    <p className="text-sm text-slate-400 -mt-2 h-5">
                        {rolls.length > 0 && `(${rolls.join(' + ')})`}
                        {modifierTotal !== 0 && (
                            <span className="font-bold">
                                {modifierTotal > 0 ? ` + ${modifierTotal}` : ` - ${Math.abs(modifierTotal)}`}
                            </span>
                        )}
                    </p>
                </>
            )}
        </div>
    </div>
);

const formatSeverity = (severity: DamageSeverity): string => {
    switch(severity) {
        case 'leve': return 'Dano Leve';
        case 'moderada': return 'Dano Moderado';
        case 'grave': return 'Dano Grave';
        case 'sem_dano': return 'Sem Dano';
        case 'no_damage': return 'Nenhum dano';
        default: return '';
    }
}


const CombatClashDisplay: React.FC<CombatClashDisplayProps> = ({ diceRoll, attacker, defender, onRoll }) => {
    const { description, status, result, outcome, damageSeverity, defenderResult } = diceRoll;
    const [isRolling, setIsRolling] = useState(false);
    const [isFinished, setIsFinished] = useState(status === 'rolled');

    const isRolled = status === 'rolled';
    const isTie = outcome === 'tie';

    const isPlayerAttacker = attacker.type === 'player';
    const player = isPlayerAttacker ? attacker : defender;
    const opponent = isPlayerAttacker ? defender : attacker;

    const playerSuccess = isRolled && result ? (isPlayerAttacker ? outcome === 'attacker_wins' : outcome === 'defender_wins') : false;
    
    const isPlayerTheWinner = isRolled && playerSuccess;
    const isOpponentTheWinner = isRolled && !playerSuccess && !isTie;

    const isPlayerWinnerForAnim = isFinished && isPlayerTheWinner && !isTie;
    const isOpponentWinnerForAnim = isFinished && isOpponentTheWinner && !isTie;

    // The cracking animation only applies to the DEFENDER when they lose (i.e., when the attacker wins).
    // This makes it clear that damage is being dealt. If the attacker loses, no one takes damage, so no cracking animation occurs.
    const showOpponentCrackAnimation = isFinished && outcome === 'attacker_wins' && isPlayerAttacker && !isTie;
    const showPlayerCrackAnimation = isFinished && outcome === 'attacker_wins' && !isPlayerAttacker && !isTie;

    const handleRoll = () => {
        if (status === 'pending' && onRoll && !isRolling) {
            setIsRolling(true);
            setTimeout(() => {
                onRoll();
            }, 800);
        }
    };
    
    useEffect(() => {
        if (status === 'rolled' && !isFinished) {
            const timer = setTimeout(() => {
                setIsFinished(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [status, isFinished]);
    
    const attackerRolls = result?.rolls ?? [];
    const attackerFinalTotal = result?.total ?? 0;
    const attackerRawTotal = result?.sum ?? 0;
    const attackerModifier = attackerFinalTotal - attackerRawTotal;
    
    const defenderRolls = defenderResult?.rolls ?? [];
    const defenderFinalTotal = defenderResult?.total ?? 0;
    const defenderRawTotal = defenderResult?.sum ?? 0;
    const defenderModifier = defenderFinalTotal - defenderRawTotal;
    
    const resultText = isTie ? 'EMPATE' : playerSuccess ? 'SUCESSO' : 'FALHA';
    const resultTextColorClass = isTie ? 'text-slate-300' : playerSuccess ? 'text-green-400' : 'text-red-400';
    const resultShadowColor = isTie ? 'shadow-zinc-500/60' : playerSuccess ? 'shadow-green-500/60' : 'shadow-red-500/60';

    const [playerFrameProps, opponentFrameProps]: [Omit<FrameContentProps, 'isPending' | 'isRolling' | 'onClick'>, Omit<FrameContentProps, 'isPending' | 'isRolling' | 'onClick'>] = isPlayerAttacker
        ? [
            { character: player, role: 'Atacante', element: 'fire', diceCount: attacker.elements.fire, resultTotal: attackerFinalTotal, rawRollTotal: attackerRawTotal, modifierTotal: attackerModifier, rolls: attackerRolls, isPlayerSide: true, isWinner: isPlayerTheWinner, isTie },
            { character: opponent, role: 'Defensor', element: 'earth', diceCount: defender.elements.earth, resultTotal: defenderFinalTotal, rawRollTotal: defenderRawTotal, modifierTotal: defenderModifier, rolls: defenderRolls, isPlayerSide: false, isWinner: isOpponentTheWinner, isTie }
          ]
        : [
            { character: player, role: 'Defensor', element: 'earth', diceCount: defender.elements.earth, resultTotal: defenderFinalTotal, rawRollTotal: defenderRawTotal, modifierTotal: defenderModifier, rolls: defenderRolls, isPlayerSide: true, isWinner: isPlayerTheWinner, isTie },
            { character: opponent, role: 'Atacante', element: 'fire', diceCount: attacker.elements.fire, resultTotal: attackerFinalTotal, rawRollTotal: attackerRawTotal, modifierTotal: attackerModifier, rolls: attackerRolls, isPlayerSide: false, isWinner: isOpponentTheWinner, isTie }
          ];


    return (
        <div className="w-full max-w-3xl mx-auto my-6 p-6 bg-[#0E0E0E] border-2 border-zinc-800/50 rounded-xl text-center">
            <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wider text-white">
                Combate
            </h3>
             <div className="h-10 flex items-center justify-center my-2 px-4">
                <p className="text-slate-300 text-base italic font-body-serif">"{description}"</p>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4">
                {/* Opponent Frame (Left) */}
                <div className={`relative w-56 h-80 ${isOpponentWinnerForAnim ? 'animate-hit-right' : ''}`}>
                    {showOpponentCrackAnimation ? (
                        <>
                            <div className="absolute inset-0 w-full h-full animate-crack-left">
                                <div className="absolute top-0 left-0 w-1/2 h-full bg-zinc-900/80 border-2 border-red-500/70 rounded-l-xl overflow-hidden">
                                    <div className="absolute top-0 left-0 w-56 h-80">
                                        <FrameContent {...opponentFrameProps} isPending={false} isRolling={isRolling} />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 w-full h-full animate-crack-right">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-zinc-900/80 border-2 border-red-500/70 rounded-r-xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-56 h-80">
                                        <FrameContent {...opponentFrameProps} isPending={false} isRolling={isRolling} />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={`w-full h-full bg-zinc-900/80 border-2 ${isFinished ? (isTie ? 'border-zinc-700' : isOpponentTheWinner ? 'border-green-500/70' : 'border-red-500/70') : 'border-zinc-700'} rounded-xl transition-colors duration-300`}>
                            <FrameContent {...opponentFrameProps} isPending={status === 'pending'} isRolling={isRolling} />
                        </div>
                    )}
                </div>


                <div className="flex flex-col items-center justify-center gap-1 text-zinc-500 flex-shrink-0 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                        <path d="m7.048 13.406l3.535 3.536l-1.413 1.414l1.415 1.415l-1.414 1.414l-2.475-2.475l-2.829 2.829l-1.414-1.414l2.829-2.83l-2.475-2.474l1.414-1.414l1.414 1.413l1.413-1.414ZM3 3l3.546.003l11.817 11.818l1.415-1.414l1.415 1.414l-2.475 2.475l2.828 2.829l-1.414 1.414l-2.829-2.829l-2.474 2.475l-1.415-1.414l1.414-1.415L3.002 6.531L2.999 3Zm14.457 0L21 3.003l.002 3.523l-4.053 4.052l-3.536-3.535L17.456 3Z"/>
                    </svg>
                    <span className="font-display text-2xl font-bold">VS</span>
                </div>
                
                {/* Player Frame (Right) */}
                <div className={`relative w-56 h-80 ${isPlayerWinnerForAnim ? 'animate-hit-left' : ''}`}>
                     {showPlayerCrackAnimation ? (
                        <>
                            <div className="absolute inset-0 w-full h-full animate-crack-left">
                                <div className="absolute top-0 left-0 w-1/2 h-full bg-zinc-900/80 border-2 border-red-500/70 rounded-l-xl overflow-hidden">
                                    <div className="absolute top-0 left-0 w-56 h-80">
                                        <FrameContent {...playerFrameProps} isPending={false} isRolling={isRolling} onClick={handleRoll} />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 w-full h-full animate-crack-right">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-zinc-900/80 border-2 border-red-500/70 rounded-r-xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-56 h-80">
                                        <FrameContent {...playerFrameProps} isPending={false} isRolling={isRolling} onClick={handleRoll} />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={`w-full h-full bg-zinc-900/80 border-2 ${isFinished ? (isTie ? 'border-zinc-700' : isPlayerTheWinner ? 'border-green-500/70' : 'border-red-500/70') : 'border-zinc-700'} rounded-xl transition-colors duration-300`}>
                           <FrameContent {...playerFrameProps} isPending={status === 'pending'} isRolling={isRolling} onClick={handleRoll} />
                        </div>
                    )}
                </div>
            </div>

            {/* Display SUCESSO/FALHA/EMPATE from player's perspective */}
            {isFinished && (
                <div className="mt-6 h-16">
                    <h2 className={`font-display text-5xl my-2 font-bold tracking-[0.3em] ${resultTextColorClass} ${resultShadowColor} [text-shadow:0_0_15px_var(--tw-shadow-color)]`}>
                        {resultText}
                    </h2>
                    {damageSeverity && damageSeverity !== 'no_damage' && (
                        <p className={`text-sm font-bold uppercase tracking-wider mt-2 ${outcome === 'attacker_wins' ? 'text-amber-400' : 'text-slate-400'}`}>
                            {formatSeverity(damageSeverity)}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default CombatClashDisplay;