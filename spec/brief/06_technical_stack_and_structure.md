# 06 - Technical Stack and Structure

**Propósito:** Este documento serve como um guia técnico de referência para a base de código do Arcana V3. Ele detalha a stack de tecnologias, a estrutura de diretórios, as convenções de código e os padrões de design chave que devem ser seguidos durante o desenvolvimento.

---

## 1. Stack de Tecnologias

O Arcana V3 é construído sobre um conjunto de tecnologias modernas e robustas, escolhidas por sua performance, escalabilidade e ecossistema de desenvolvimento.

-   **Frontend Framework:** **React 18** com **Vite** como build tool.
-   **Linguagem:** **TypeScript** (Modo Estrito). A segurança de tipos é um princípio não-negociável do projeto.
-   **Backend-as-a-Service:** **Supabase**
    -   **Banco de Dados:** PostgreSQL
    -   **Autenticação:** Supabase Auth (com foco no login via e-mail/senha gerado a partir do "Nome de Aventureiro").
    -   **Armazenamento de Arquivos:** Supabase Storage (para imagens de personagens e outros ativos).
    -   **Banco de Dados Vetorial:** Extensão `pgvector` para habilitar a busca RAG.
-   **Gerenciamento de Estado:** **Zustand**
    -   Escolhido como a biblioteca primária para estado global do cliente devido à sua simplicidade, performance e API que previne re-renderizações desnecessárias através de seletores.
-   **APIs de IA (Modelos de Linguagem):** O sistema é projetado para ser agnóstico, mas a implementação inicial foca nos modelos da **Google (Gemini)**, utilizando suas capacidades de Saída Estruturada (JSON) e Tool Calling.
-   **Estilização:** **Tailwind CSS**. Escolhido para um desenvolvimento rápido de UI e um sistema de design consistente baseado em utilitários.
-   **Testes:**
    -   **Testes Unitários e de Integração:** **Vitest**.
    -   **Testes End-to-End (E2E):** **Playwright**.

## 2. Estrutura de Diretórios (Pós-Refatoração)

A estrutura do diretório `/src` é organizada por funcionalidade e responsabilidade para maximizar a coesão e a localização de código.

-   **/components:** Componentes de UI "burros" e reutilizáveis (ex: `Button.tsx`, `Modal.tsx`).
-   **/constants:** Valores constantes e imutáveis usados em toda a aplicação.
-   **/features:** Componentes "inteligentes" que representam telas ou seções completas da aplicação (ex: `/game-room`, `/campaign-creation`). Eles orquestram os dados e a lógica.
    -   Cada `feature` contém uma subpasta `/components` para componentes visuais que são específicos apenas para aquela feature.
-   **/hooks:** Lógica de UI reutilizável. Cada hook tem uma responsabilidade única e clara (ex: `useGameUI.ts`, `useGameActions.ts`).
-   **/services:** A camada de lógica de negócio e comunicação com serviços externos.
    -   **/services/db:** Serviços atômicos, cada um responsável pelo CRUD de uma ou mais tabelas relacionadas do Supabase (ex: `character.service.ts`).
    -   **/services/ai:** Serviços que orquestram a comunicação com as APIs de IA (ex: `campaignGeneratorService.ts`).
-   **/store:** Onde reside o estado global da aplicação. Utiliza Zustand (`useGameStore.ts`, `authStore.ts`, etc.).
-   **/types:** Onde todas as definições de `interface` e `type` do TypeScript são armazenadas. Este diretório funciona como o "contrato de dados" do projeto.
-   **/utils:** Funções puras, auxiliares e sem estado que podem ser usadas em qualquer lugar da aplicação (ex: `dbUtils.ts`).

## 3. Convenções e Padrões de Design

A consistência é chave para a manutenibilidade do projeto. Todos os desenvolvedores devem aderir aos seguintes padrões.

### 3.1. Nomenclatura e Formato

-   **Componentes:** PascalCase (ex: `PlayerInputBar.tsx`).
-   **Hooks:** camelCase com o prefixo `use` (ex: `useGameActions.ts`).
-   **Serviços e Utilitários:** camelCase (ex: `campaign.service.ts`).
-   **Banco de Dados (Supabase):** `snake_case` para nomes de tabelas e colunas.
-   **Tradução de Case:** A camada de serviço em `/services/db` é a única responsável pela tradução entre `camelCase` (cliente) e `snake_case` (banco de dados), utilizando as funções em `utils/dbUtils.ts`.

### 3.2. Caminhos de Importação

-   **Alias de Caminho:** O uso do alias `@/` que aponta para o diretório `/src` é **obrigatório** para todas as importações, a fim de evitar caminhos relativos complexos (`../../../`).
-   **Separador de Caminho:** O uso da **barra normal (`/`)** é **obrigatório**. A barra invertida (`\`) é estritamente proibida para garantir a compatibilidade entre sistemas operacionais.

### 3.3. Configuração Como Dados

-   **Princípio:** Para maximizar a agilidade e o controle, configurações críticas da aplicação não são "hard-coded". Elas são armazenadas como dados no Supabase e carregadas na inicialização da aplicação.
-   **Implementação:**
    -   **Tabela `prompts`:** Armazena o texto completo de todos os prompts da IA (ex: `NARRATOR_SYSTEM_INSTRUCTION`, `GENESIS_PROMPT_TEMPLATE`). Isso permite o ajuste fino da "personalidade" e do comportamento da IA em tempo real através do Editor de Conteúdo.
    -   **Tabela `rules`:** Armazena a base de conhecimento de regras do jogo. Cada entrada representa um "chunk" de informação (ex: a regra de dano, a descrição de uma mecânica). Este conteúdo é vetorizado (`embedding`) e usado pela IA Mestre através da busca RAG para responder a perguntas sobre as regras.

### 3.4. Ferramentas e Observabilidade

-   **DevLogDrawer:** A ferramenta primária para depuração e observabilidade. É um painel de desenvolvimento que fornece um feed em tempo real de todos os eventos significativos do sistema: mudanças de estado do Zustand, chamadas de API para IA e Supabase (com payloads), e eventos do motor de regras.
-   **Testes Automatizados:** A qualidade do código é garantida por uma pirâmide de testes:
    -   **Unitários (Vitest):** Para os serviços de regras (`engineService`), utilitários e lógica pura.
    -   **Integração (Vitest):** Para os serviços de banco de dados (`services/db`), que se conectam a um banco de dados de teste para validar o CRUD.
    -   **End-to-End (Playwright):** Para os fluxos de usuário críticos (ex: ciclo completo de criar-salvar-carregar campanha).