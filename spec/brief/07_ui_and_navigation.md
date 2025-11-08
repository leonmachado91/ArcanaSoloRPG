# 07 - UI and Navigation

**Propósito:** Este documento descreve a arquitetura da interface do usuário (UI), a filosofia de design e o fluxo de navegação do Arcana V3. Ele serve como um guia para entender como a aplicação é visualmente estruturada e como o jogador se move através de suas diferentes funcionalidades.

---

## 1. Filosofia de Design

A interface do Arcana é projetada para ser um portal para a imersão, não um obstáculo. A filosofia de design é subserviente à experiência narrativa e segue três princípios chave:

1.  **Imersão sobre Estilo:** O design é intencionalmente minimalista e utiliza um tema escuro. O objetivo é que a UI "desapareça", permitindo que o conteúdo — a história, as descrições, a arte dos personagens — seja o foco principal. Efeitos visuais e animações são usados com moderação e apenas para fornecer feedback claro, nunca para distrair.

2.  **Funcionalidade Clara:** Cada elemento da UI tem um propósito claro. Não há elementos puramente decorativos. Botões, painéis e modais são projetados para serem intuitivos, garantindo que o jogador possa navegar e interagir com o sistema de regras e o estado do jogo sem ambiguidades.

3.  **Consistência é Previsibilidade:** A aplicação utiliza um sistema de design consistente. Componentes como botões, inputs e modais têm a mesma aparência e comportamento em toda a aplicação. Isso cria uma experiência previsível e reduz a carga cognitiva do jogador, permitindo que ele se concentre na história.

## 2. O Design System e Componentes Reutilizáveis

A consistência visual é alcançada através de um sistema de design centralizado.

-   **Tecnologia:** A estilização é feita primariamente com **Tailwind CSS**, que permite a criação rápida de layouts e componentes consistentes através de classes de utilitários.
-   **Biblioteca de Componentes:** O diretório `/components/ui` contém a biblioteca de componentes "burros" e reutilizáveis, que formam os blocos de construção de toda a interface. Exemplos incluem:
    -   `Button.tsx`
    -   `Input.tsx`
    -   `Textarea.tsx`
    -   `Modal.tsx`
    -   `Drawer.tsx` (para painéis laterais)
    -   `Spinner.tsx`
    -   `Toast.tsx`

## 3. Fluxo de Navegação (O Mapa da Aplicação)

A navegação do Arcana é linear e projetada para guiar o jogador através do processo de criação até o jogo em si. O gerenciamento da tela ativa é controlado por um sistema de roteamento simples (provavelmente baseado em um `NavigationContext` ou um slice do `useGameStore`).

O fluxo principal é o seguinte:

1.  **`WelcomeScreen.tsx`** (`/features/welcome`)
    -   **Entrada:** É a primeira tela da aplicação.
    -   **Ação:** O jogador insere o "Nome de Aventureiro" e submete.
    -   **Saída:** Após a autenticação bem-sucedida, navega para a `HomeScreen`.

2.  **`HomeScreen.tsx`** (`/features/home`)
    -   **Entrada:** A tela principal após o login.
    -   **Ações:**
        -   Clicar em "Iniciar Nova Campanha" -> Navega para `CreateCampaignScreen`.
        -   Clicar em "Campanhas Salvas" -> Navega para `SavedGamesScreen`.

3.  **`CreateCampaignScreen.tsx` / `CreateCharacterScreen.tsx`**
    -   **Entrada:** A partir da `HomeScreen`.
    -   **Padrão:** Um assistente (wizard) de múltiplos passos que guia o jogador através da coleta de dados. A UI utiliza um `StepIndicator.tsx` para mostrar o progresso.
    -   **Saída:** Após a conclusão, aciona a `CampaignLoadingScreen` e, em seguida, navega para a `GameRoomScreen`.

4.  **`SavedGamesScreen.tsx`** (`/features/saved-games`)
    -   **Entrada:** A partir da `HomeScreen`.
    -   **Funcionalidade:** Exibe uma lista de campanhas salvas pelo usuário.
    -   **Ações:**
        -   Clicar em "Carregar" -> Hidrata o estado do jogo e navega para a `GameRoomScreen`.
        -   Clicar em "Deletar" -> Remove a campanha do banco de dados.

5.  **`GameRoomScreen.tsx`** (`/features/game-room`)
    -   **Entrada:** É a tela central do jogo, acessada após criar ou carregar uma campanha.
    -   **Saída:** O jogador pode clicar em "Sair para o Menu", o que o leva de volta para a `HomeScreen`.

## 4. Arquitetura de Layout das Telas Principais

As telas mais complexas são montadas a partir de componentes menores e dedicados.

### 4.1. `GameRoomScreen.tsx` (Pós-Refatoração)
O `GameRoomScreen.tsx` em si é um componente de layout puro. Ele utiliza o hook orquestrador `useGameRoom` e monta a tela usando os seguintes sub-componentes especializados de `/features/game-room/components/`:

-   **Painel Esquerdo (`PlayerSummaryPanel.tsx`):** Ocupa a lateral esquerda da tela, exibindo a ficha de personagem resumida (`CharacterSummaryCard.tsx`) do jogador.
-   **Área Central (Conteúdo Principal):**
    -   **Topo (`ChatDisplay.tsx`):** A maior parte da área central, exibe o histórico de mensagens da conversa com a IA Mestre.
    -   **Base (`PlayerInputBar.tsx`):** A barra de input na parte inferior, contendo o `Textarea` para a ação do jogador e botões de ação (ex: "Enviar").
-   **Painel Direito (`NpcsInScenePanel.tsx`):** Um painel lateral que pode ser aberto/fechado. Exibe a lista de NPCs e outras entidades presentes na cena atual.

### 4.2. Overlays Globais

A aplicação utiliza um componente `GlobalOverlays.tsx` no nível raiz (`App.tsx`) para gerenciar elementos que aparecem "por cima" de toda a UI.

-   **Modais (`Modal.tsx`):** Usados para ações confirmatórias (ex: "Tem certeza de que deseja sair?"). Seu estado de aberto/fechado é gerenciado pelo `useGameUI.ts`.
-   **Toasts/Notificações (`Toast.tsx`):** Usados para feedback não-bloqueante (ex: "Jogo salvo com sucesso"). Seu estado é gerenciado por um `ErrorContext` ou um store dedicado.

### 4.3. Painéis de Ferramentas do Arquiteto
São componentes especiais, disponíveis apenas para fins de desenvolvimento e depuração, acessíveis através de ícones discretos na UI.

-   **`DevLogDrawer.tsx`:** Um painel deslizante que exibe um log detalhado de todos os eventos do sistema em tempo real.
-   **`RulesEngineTester.tsx`:** Uma aba dentro do `DevLogDrawer` que fornece uma interface para acionar manualmente funções do `engineService` (O Juiz), permitindo testar as regras do jogo sem a necessidade de interação com a IA.