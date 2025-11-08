// services/engineService.ts
// Este serviço contém a lógica pura do motor de regras do jogo, migrada da
// arquitetura V3 para ser compatível com o estado principal da aplicação (V2).

import { v4 as uuidv4 } from 'uuid';
import { Character, Element, DamageSeverity } from '../types/character';
import { useCatalogStore, ArcanaDecks } from '../store/catalogStore';
import { oracles, OracleTableName } from '../data/rules/oracles';
// FIX: Import ArcanaCardDraw from the central types definition to ensure consistency.
import { ArcanaCardDraw } from '../types/chat';

export type CharacterStateInfo = {
  id: string;
  states: Character['states'];
};

export type DiceRollResult = {
  total: number;
  rolls: number[];
};

export type DifficultyCheckResult = {
  isSuccess: boolean;
  rollResult: DiceRollResult;
  difficulty: number;
  modifier: number;
  finalTotal: number;
};

export type OracleResult = {
  roll: number;
  result: string;
};

export type ContestedCheckOutcome = 'attacker_wins' | 'defender_wins' | 'tie';

export interface ContestedCheckResult {
  outcome: ContestedCheckOutcome;
  attackerRoll: DiceRollResult;
  defenderRoll: DiceRollResult;
  attackerFinalTotal: number;
  defenderFinalTotal: number;
  attackerModifier: number;
  defenderModifier: number;
  damageSeverity?: DamageSeverity;
}

export interface AddProgressResult {
  newTotalProgressPoints: number;
  newElementPointsAwarded: number;
}


/**
 * Rola um número especificado de dados de 6 lados (d6).
 */
function rollDice(numDice: number): DiceRollResult {
  if (numDice <= 0) {
    return { total: 0, rolls: [] };
  }
  const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { total, rolls };
}

/**
 * Executa um teste de dificuldade.
 */
function performDifficultyCheck(numDice: number, difficulty: number, modifier: number = 0): DifficultyCheckResult {
  const rollResult = rollDice(numDice);
  const finalTotal = rollResult.total + modifier;
  const isSuccess = finalTotal >= difficulty;
  return { isSuccess, rollResult, difficulty, modifier, finalTotal };
}

/**
 * Calcula a severidade do dano com base nos resultados dos dados de defesa.
 */
function calculateDamageSeverity(defenseRolls: number[]): DamageSeverity {
  if (defenseRolls.length === 0) return 'no_damage';
  const counts: Record<number, number> = {};
  for (const roll of defenseRolls) {
    counts[roll] = (counts[roll] || 0) + 1;
  }
  if ((counts[1] || 0) >= 3) return 'grave';
  if ((counts[6] || 0) >= 3) return 'sem_dano';
  for (const num of [2, 3, 4, 5]) {
    if ((counts[num] || 0) >= 3) return 'moderada';
  }
  return 'leve';
}

/**
 * Executa uma ação contestada entre um atacante e um defensor.
 */
function performContestedCheck(attackerDice: number, defenderDice: number, attackerModifier: number = 0, defenderModifier: number = 0): ContestedCheckResult {
  const attackerRoll = rollDice(attackerDice);
  const defenderRoll = rollDice(defenderDice);

  const attackerFinalTotal = attackerRoll.total + attackerModifier;
  const defenderFinalTotal = defenderRoll.total + defenderModifier;

  let outcome: ContestedCheckOutcome;
  let damageSeverity: DamageSeverity | undefined = undefined;

  if (attackerFinalTotal > defenderFinalTotal) {
    outcome = 'attacker_wins';
    damageSeverity = calculateDamageSeverity(defenderRoll.rolls);
  } else if (defenderFinalTotal > attackerFinalTotal) {
    outcome = 'defender_wins';
  } else {
    outcome = 'tie';
  }

  return { outcome, attackerRoll, defenderRoll, attackerFinalTotal, defenderFinalTotal, damageSeverity, attackerModifier, defenderModifier };
}

/**
 * Determina o elemento dominante de um personagem com base em seus pontos de elemento.
 */
function getDominantElement(elements: Character['elements']): Element {
    if (!elements) return 'fire';
    const elementValues: { element: Element; value: number }[] = [
        { element: 'fire', value: elements.fire },
        { element: 'water', value: elements.water },
        { element: 'air', value: elements.air },
        { element: 'earth', value: elements.earth },
    ];
    elementValues.sort((a, b) => b.value - a.value);
    return elementValues[0].element;
}

/**
 * Calcula o modificador para uma ação conjunta.
 */
function calculateCooperationModifier(mainActorElements: Character['elements'], helpersElements: Character['elements'][]): number {
    const opposites: Record<Element, Element> = { fire: 'water', water: 'fire', air: 'earth', earth: 'air' };
    const mainActorElement = getDominantElement(mainActorElements);
    let modifier = 0;
    for (const helperElements of helpersElements) {
        const helperElement = getDominantElement(helperElements);
        if (helperElement === mainActorElement) modifier += 1;
        else if (opposites[mainActorElement] === helperElement) modifier -= 1;
    }
    return modifier;
}

/**
 * Processa o fim de um turno, atualizando a duração das condições.
 */
function processTurnEnd(charactersStates: CharacterStateInfo[]): CharacterStateInfo[] {
    const changedCharacters: CharacterStateInfo[] = [];
    charactersStates.forEach(charInfo => {
        if (charInfo.states && charInfo.states.length > 0) {
            let characterWasModified = false;
            const updatedStates = (charInfo.states || [])
                .map(cond => {
                    if (cond.remaining_turns != null && cond.remaining_turns > 0) {
                        characterWasModified = true;
                        return { ...cond, remaining_turns: cond.remaining_turns - 1 };
                    }
                    return cond;
                })
                .filter(cond => cond.remaining_turns == null || cond.remaining_turns > 0);
            
            if (characterWasModified || updatedStates.length !== charInfo.states.length) {
                changedCharacters.push({ id: charInfo.id, states: updatedStates });
            }
        }
    });
    return changedCharacters;
}

/**
 * Sorteia uma carta de cada baralho do Arcana.
 */
function drawArcanaCards(decks: ArcanaDecks): ArcanaCardDraw {
    const draw = (deck: string[]) => {
        if (deck.length === 0) return 'N/A'; // Fallback se as cartas não carregaram
        return deck[Math.floor(Math.random() * deck.length)];
    };
    // FIX: Update return object to use English property names to match the ArcanaCardDraw type.
    return {
        verb: draw(decks.verbo),
        theme: draw(decks.tema),
        adjective: draw(decks.adjetivo),
        emotion: draw(decks.emocao),
    };
}

/**
 * Consulta uma tabela de oráculo.
 */
function queryOracle(oracleName: OracleTableName): OracleResult | null {
    const table = oracles[oracleName];
    if (!table) return null;
    const roll = Math.floor(Math.random() * 100) + 1;
    const entry = table.find(e => roll >= e.min && roll <= e.max);
    if (!entry) {
        console.error(`Nenhuma entrada encontrada para a rolagem ${roll} no oráculo '${oracleName}'.`);
        return null;
    }
    return { roll, result: entry.result };
}

/**
 * Processa a recompensa de Pontos de Progresso para um personagem.
 */
function addProgressPoints(currentProgressPoints: number, pointsToAdd: number): AddProgressResult {
  const POINTS_PER_MARK = 4;
  const oldMarks = Math.floor(currentProgressPoints / POINTS_PER_MARK);
  const newTotalProgressPoints = currentProgressPoints + pointsToAdd;
  const newMarks = Math.floor(newTotalProgressPoints / POINTS_PER_MARK);
  const newElementPointsAwarded = newMarks - oldMarks;
  return { newTotalProgressPoints, newElementPointsAwarded };
}

export const engineService = {
  rollDice,
  performDifficultyCheck,
  processTurnEnd,
  drawArcanaCards,
  queryOracle,
  addProgressPoints,
  performContestedCheck,
  calculateDamageSeverity,
  calculateCooperationModifier,
};