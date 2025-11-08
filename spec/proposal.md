# Proposta de Estabilizacao da Suite de Testes

## 1. Contexto

Ao rodar `npx tsc --noEmit` e `npm test`, percebemos que a suite atual mistura testes unitarios, integracoes que dependem do Supabase e cenarios E2E em Playwright. Isso causa falhas previsiveis quando o ambiente local nao possui credenciais validas ou quando o Vitest tenta executar arquivos exclusivos do Playwright. Alem disso, alguns testes unitarios (`engineService.test.ts`) usam *spies* que nao tem efeito, porque a implementacao invoca funcoes internas e nao o servico exportado.

## 2. Objetivos

- Garantir que `npm test` (Vitest) execute apenas os testes unitarios/integrados que nao dependem de infraestrutura externa.
- Atualizar os testes de `engineService` para produzir resultados deterministicos sem depender de mocks inconsistentes.
- Permitir que o teste de integracao com Supabase rode somente quando houver credenciais de teste configuradas e autenticadas.

## 3. Plano Detalhado

### 3.1. Isolar testes E2E do Playwright

- Criar um `vitest.config.ts` que reaproveite os plugins do Vite e configure o bloco `test` para:
  - Definir `environment: 'jsdom'`.
  - Ajustar `include`/`exclude` para ignorar `src/e2e/**` (mantendo apenas unitarios/integracoes no Vitest).
  - Centralizar o que for necessario para futuras configuracoes de setup global.
- Explicitar na documentacao (ou comentario no arquivo) que os cenarios E2E devem ser executados via `npm run test:e2e`.

### 3.2. Tornar `engineService.test.ts` deterministico

- Introduzir um helper local que injete sequencias de valores em `Math.random`, garantindo `mockRestore()` ao termino.
- Reescrever os cenarios de `performDifficultyCheck` e `performContestedCheck` usando sequencias condizentes com o numero de dados rolados (ajustando os personagens para valores coerentes) e validar os resultados com base na regra real do motor.
- Remover o uso de `vi.spyOn(engineService, 'rollDice')`, substituindo por mocks dos valores aleatorios ou por verificacoes diretas das saidas.

### 3.3. Condicionar o teste de integracao com Supabase

- Ler variaveis como `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_SUPABASE_EMAIL` e `TEST_SUPABASE_PASSWORD`.
- Usar um alias (`const describeIntegration = canRunSupabaseTests ? describe : describe.skip`) para pular a suite quando as credenciais nao estiverem disponiveis, exibindo um aviso amigavel.
- Em `beforeAll`, autenticar com `supabase.auth.signInWithPassword`; em `afterAll`, chamar `supabase.auth.signOut`.
- Manter a limpeza de dados apenas quando o teste for executado, evitando chamadas desnecessarias ao Supabase.

## 4. Riscos e Mitigacoes

- **Configuracoes ausentes**: com o alias, o teste de Supabase sera ignorado e mostraremos um aviso para lembrar o time de como habilita-lo.
- **Falsa sensacao de sucesso**: ao separar E2E de unitarios, deixamos claro que `npm test` cobre apenas uma parte; o comando dedicado de Playwright permanece disponivel.
- **Alteracoes nos testes do motor**: como apenas ajustaremos dados de teste e mocks de aleatoriedade, nao ha impacto na logica de producao.

## 5. Resultado Esperado

- `npm test` passa sem falhas em ambientes sem Supabase configurado, executando apenas o que e suportado localmente.
- Testes do motor de regras tornam-se rapidos e confiaveis, detectando regressoes reais em vez de flutuacoes aleatorias.
- Quem precisar validar integracoes ou E2E sabera exatamente quais comandos executar e quais variaveis definir.


