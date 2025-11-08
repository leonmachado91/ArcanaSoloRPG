// utils/characterUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateElements } from './characterUtils';
import { MOCK_ADVANTAGES } from '../data/rules/traits';

describe('calculateElements', () => {
  it('should return base values (1 for each) when no advantages are provided', () => {
    const result = calculateElements([], MOCK_ADVANTAGES);
    expect(result).toEqual({ fire: 1, water: 1, air: 1, earth: 1 });
  });

  it('should correctly calculate elements with one advantage of each type', () => {
    const advantages = ["Atleta Completo", "Empatia Afiada", "Erudito", "Corpo de Ferro"];
    const result = calculateElements(advantages, MOCK_ADVANTAGES);
    // Atleta Completo -> fire
    // Empatia Afiada -> water
    // Erudito -> air
    // Corpo de Ferro -> earth
    expect(result).toEqual({ fire: 2, water: 2, air: 2, earth: 2 });
  });

  it('should correctly calculate elements with multiple advantages of the same type', () => {
    const advantages = ["Atleta Completo", "Mãos Rápidas", "Golpe Preciso"]; // All are fire
    const result = calculateElements(advantages, MOCK_ADVANTAGES);
    expect(result).toEqual({ fire: 4, water: 1, air: 1, earth: 1 });
  });
  
  it('should handle an empty or null advantages array gracefully', () => {
    expect(calculateElements([], MOCK_ADVANTAGES)).toEqual({ fire: 1, water: 1, air: 1, earth: 1 });
    expect(calculateElements(null as any, MOCK_ADVANTAGES)).toEqual({ fire: 1, water: 1, air: 1, earth: 1 });
    expect(calculateElements(undefined as any, MOCK_ADVANTAGES)).toEqual({ fire: 1, water: 1, air: 1, earth: 1 });
  });

  it('should ignore advantages that are not found in the rules', () => {
    const advantages = ["Atleta Completo", "Vantagem Inexistente"];
    const result = calculateElements(advantages, MOCK_ADVANTAGES);
    expect(result).toEqual({ fire: 2, water: 1, air: 1, earth: 1 });
  });
});