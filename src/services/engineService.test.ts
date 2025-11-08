// services/engineService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { engineService, CharacterStateInfo } from './engineService';
import { Character, Element } from '../types/character';
import { oracles } from '../data/rules/oracles';
import { ArcanaDecks } from '@/store/catalogStore';

const randomValueForFace = (face: number): number => {
  if (face < 1 || face > 6) {
    throw new Error(`Face de dado inválida: ${face}`);
  }
  return (face - 0.5) / 6;
};

const withMockedDice = <T>(faces: number[], fn: () => T): T => {
  const randomSpy = vi.spyOn(Math, 'random');
  faces.forEach(face => randomSpy.mockReturnValueOnce(randomValueForFace(face)));
  try {
    return fn();
  } finally {
    randomSpy.mockRestore();
  }
};

describe('engineService', () => {
  describe('rollDice', () => {
    it('should return a total of 0 and an empty array when rolling 0 dice', () => {
      const result = engineService.rollDice(0);
      expect(result.total).toBe(0);
      expect(result.rolls).toEqual([]);
    });

    it('should roll the correct number of dice', () => {
      const result = engineService.rollDice(3);
      expect(result.rolls).toHaveLength(3);
    });
  });

  describe('performDifficultyCheck', () => {
    it('should return isSuccess: true if total roll is greater than difficulty', () => {
      const result = withMockedDice([6, 5, 4], () => engineService.performDifficultyCheck(3, 10));
      expect(result.rollResult.total).toBe(15);
      expect(result.rollResult.rolls).toEqual([6, 5, 4]);
      expect(result.isSuccess).toBe(true);
    });
  });

  // Mock de personagem base para os testes
  const baseCharacter: Omit<Character, 'progressTrack'> = {
    id: 'player-1',
    type: 'player',
    name: 'Test Player',
    age: 25,
    description: '',
    personalityTraits: [],
    imageUrl: '',
    elements: { fire: 1, water: 1, air: 1, earth: 1 },
    advantages: [],
    disadvantages: [],
    progressPoints: 0,
    unspentElementPoints: 0,
    history: '',
    states: [],
    items: [],
  };

  describe('performContestedCheck', () => {
    it('should declare attacker as winner and calculate damage severity', () => {
      const attacker: Character = { ...baseCharacter, elements: { fire: 3, water: 1, air: 1, earth: 1 }};
      const defender: Character = { ...baseCharacter, elements: { fire: 1, water: 1, air: 1, earth: 3 }};
      const result = withMockedDice(
        [6, 5, 4, 3, 2, 2],
        () => engineService.performContestedCheck(attacker.elements.fire, defender.elements.earth)
      );
      expect(result.outcome).toBe('attacker_wins');
      expect(result.damageSeverity).toBe('leve');
      expect(result.attackerFinalTotal).toBe(15);
      expect(result.defenderFinalTotal).toBe(7);
    });
    
    it('should apply attacker modifier correctly', () => {
        const attacker: Character = { ...baseCharacter, elements: { fire: 2, water: 1, air: 1, earth: 1 }};
        const defender: Character = { ...baseCharacter, elements: { fire: 1, water: 1, air: 1, earth: 2 }};
        const result = withMockedDice(
            [5, 5, 6, 6],
            () => engineService.performContestedCheck(attacker.elements.fire, defender.elements.earth, 3, 0)
        );
        // Attacker would lose (10 vs 12), but modifier makes them win (10+3 vs 12)
        expect(result.outcome).toBe('attacker_wins');
        expect(result.attackerFinalTotal).toBe(13);
        expect(result.defenderFinalTotal).toBe(12);
    });

    it('should apply defender modifier correctly', () => {
        const attacker: Character = { ...baseCharacter, elements: { fire: 2, water: 1, air: 1, earth: 1 }};
        const defender: Character = { ...baseCharacter, elements: { fire: 1, water: 1, air: 1, earth: 2 }};
        const result = withMockedDice(
            [5, 6, 5, 5],
            () => engineService.performContestedCheck(attacker.elements.fire, defender.elements.earth, 0, 2)
        );
        // Defender would lose (11 vs 10), mas o modificador muda o resultado
        expect(result.outcome).toBe('defender_wins');
        expect(result.attackerFinalTotal).toBe(11);
        expect(result.defenderFinalTotal).toBe(12);
    });
  });

  describe('calculateDamageSeverity', () => {
    it('should return "grave" for three or more 1s', () => {
      expect(engineService.calculateDamageSeverity([1, 1, 1])).toBe('grave');
    });
    it('should return "sem_dano" for three or more 6s', () => {
      expect(engineService.calculateDamageSeverity([6, 6, 6])).toBe('sem_dano');
    });
    it('should return "moderada" for any other triplet', () => {
      expect(engineService.calculateDamageSeverity([5, 5, 5])).toBe('moderada');
    });
    it('should return "leve" for all other cases', () => {
      expect(engineService.calculateDamageSeverity([1, 2, 3])).toBe('leve');
      expect(engineService.calculateDamageSeverity([4, 4, 5])).toBe('leve');
    });
  });

  describe('calculateCooperationModifier', () => {
    const createCharWithDominantElement = (id: string, elements: Character['elements']): Character => ({ ...baseCharacter, id, elements });
    it('should return +1 for one similar helper', () => {
      const mainActor = createCharWithDominantElement('a', { fire: 3, water: 1, air: 1, earth: 1 });
      const helper1 = createCharWithDominantElement('h1', { fire: 2, water: 1, air: 1, earth: 1 });
      const modifier = engineService.calculateCooperationModifier(mainActor.elements, [helper1.elements]);
      expect(modifier).toBe(1);
    });
    it('should return -1 for one opposite helper', () => {
      const mainActor = createCharWithDominantElement('a', { fire: 3, water: 1, air: 1, earth: 1 });
      const helper1 = createCharWithDominantElement('h1', { fire: 1, water: 2, air: 1, earth: 1 });
      const modifier = engineService.calculateCooperationModifier(mainActor.elements, [helper1.elements]);
      expect(modifier).toBe(-1);
    });
  });

  describe('processTurnEnd', () => {
    it('should decrement remaining_turns and remove expired conditions', () => {
      const charWithConditions: Character = {
        ...baseCharacter,
        states: [
            { name: 'Fadiga', description: '', type: 'negative', intensity: 'Leve', remaining_turns: 5 } as any,
            { name: 'Corte', description: '', type: 'negative', intensity: 'Leve', remaining_turns: 1 } as any,
            { name: 'Coragem', description: '', type: 'positive' } as any, // Sem `remaining_turns`
        ]
      };
      
      const input: CharacterStateInfo[] = [{ id: charWithConditions.id, states: charWithConditions.states }];
      const result = engineService.processTurnEnd(input);
      
      expect(result).toHaveLength(1); // Only one character had changes
      const updatedChar = result[0];
      expect(updatedChar.states).toHaveLength(2);
      expect((updatedChar.states[0] as any).remaining_turns).toBe(4);
      expect(updatedChar.states[1].name).toBe('Coragem');
    });
  });

  describe('drawArcanaCards', () => {
    it('should return an object with four required keys', () => {
        const mockDecks: ArcanaDecks = {
            verbo: ['Vingar'],
            tema: ['Mentira'],
            adjetivo: ['Cruel'],
            emocao: ['Devoção'],
        };
      const result = engineService.drawArcanaCards(mockDecks);
      expect(result).toHaveProperty('verb');
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('adjective');
      expect(result).toHaveProperty('emotion');
      expect(result.verb).toBe('Vingar');
    });
  });

  describe('queryOracle', () => {
    it('should return a valid result', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.74);
      const result = engineService.queryOracle('npc_combat_action');
      const expectedEntry = oracles.npc_combat_action.find(e => 75 >= e.min && 75 <= e.max);
      expect(result?.roll).toBe(75);
      expect(result?.result).toBe(expectedEntry?.result);
      vi.mocked(Math.random).mockRestore();
    });
  });

  describe('addProgressPoints', () => {
    it('should complete one mark and award one element point', () => {
        const currentPoints = 3;
        const result = engineService.addProgressPoints(currentPoints, 2); // 3+2 = 5 points -> 1 mark crossed
        expect(result.newTotalProgressPoints).toBe(5);
        expect(result.newElementPointsAwarded).toBe(1);
    });

    it('should complete multiple marks and award multiple element points', () => {
        const currentPoints = 2;
        const result = engineService.addProgressPoints(currentPoints, 7); // 2+7 = 9 points -> 2 marks crossed
        expect(result.newTotalProgressPoints).toBe(9);
        expect(result.newElementPointsAwarded).toBe(2);
    });

     it('should not award points if no mark is crossed', () => {
        const currentPoints = 5;
        const result = engineService.addProgressPoints(currentPoints, 2); // 5+2 = 7 points -> no new mark crossed
        expect(result.newTotalProgressPoints).toBe(7);
        expect(result.newElementPointsAwarded).toBe(0);
    });
  });
});
