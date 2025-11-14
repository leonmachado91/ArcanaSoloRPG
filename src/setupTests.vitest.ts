// Arquivo carregado apenas pelo Vitest (configure em vitest.config.ts)
// Evite movimentar estes imports para qualquer arquivo que seja executado pela app em runtime.
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
