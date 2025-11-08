// utils/aiUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTokens, calculateCost } from './aiUtils';
import { MODEL_DETAILS } from '../data/ai/models';

describe('aiUtils', () => {

  describe('calculateTokens', () => {
    it('should estimate 1 token for a 4-character string', () => {
      expect(calculateTokens('test')).toBe(1);
    });

    it('should estimate 2 tokens for a 5-character string', () => {
      expect(calculateTokens('tests')).toBe(2);
    });

    it('should estimate 0 tokens for an empty string', () => {
      expect(calculateTokens('')).toBe(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for gemini-flash-latest', () => {
      const model = 'gemini-flash-latest';
      const inputTokens = 10000;
      const outputTokens = 2000;
      const expectedCost = (10000 / 1000000 * MODEL_DETAILS[model].pricing.input) + (2000 / 1000000 * MODEL_DETAILS[model].pricing.output);
      expect(calculateCost(inputTokens, outputTokens, model)).toBeCloseTo(expectedCost, 8);
    });

    it('should calculate cost correctly for gemini-2.5-pro (below tier)', () => {
        const model = 'gemini-2.5-pro';
        const inputTokens = 100000; // less than 200k threshold
        const outputTokens = 10000;
        const expectedCost = (100000 / 1000000 * MODEL_DETAILS[model].pricing.input) + (10000 / 1000000 * MODEL_DETAILS[model].pricing.output);
        expect(calculateCost(inputTokens, outputTokens, model)).toBeCloseTo(expectedCost, 8);
    });

    it('should calculate cost correctly for gemini-2.5-pro (above tier)', () => {
        const model = 'gemini-2.5-pro';
        const inputTokens = 250000; // more than 200k threshold
        const outputTokens = 20000;
        const expectedCost = (250000 / 1000000 * MODEL_DETAILS[model].pricing.tiered.input) + (20000 / 1000000 * MODEL_DETAILS[model].pricing.tiered.output);
        expect(calculateCost(inputTokens, outputTokens, model)).toBeCloseTo(expectedCost, 8);
    });

    it('should return 0 if the model is not found in MODEL_DETAILS', () => {
      const model = 'unknown-model';
      const inputTokens = 1000;
      const outputTokens = 1000;
      expect(calculateCost(inputTokens, outputTokens, model)).toBe(0);
    });
  });

});