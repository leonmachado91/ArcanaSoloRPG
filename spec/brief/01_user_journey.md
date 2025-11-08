# 01 - User Journey: A Jornada do Jogador

**Propósito:** Este documento detalha a sequência completa de interações do usuário com a plataforma Arcana V3. Ele serve como um mapa da experiência do jogador, descrevendo cada fase principal, suas funcionalidades e o fluxo de dados correspondente.

---

## 1. Fase I: A Entrada no Mundo (Boas-vindas e Autenticação)

Esta fase é projetada para o mínimo de fricção, convidando o jogador a entrar no universo do Arcana da forma mais rápida e imersiva possível.

-   **Tela:** `WelcomeScreen.tsx`
-   **Funcionalidade: "Acesso Arcade"**
    1.  O jogador é recebido com uma interface simples que solicita apenas um **"Nome de Aventureiro"**.
    2.  Ao submeter, o `authService.ts` é acionado. Ele utiliza o nome fornecido para gerar um e-mail (`<nome>@example.com`) e uma senha determinística.
    3.  O serviço tenta primeiro criar uma nova conta de usuário no Supabase. Se o usuário já existir (indicado por um erro de "User already registered"), o serviço tenta automaticamente fazer o login com as mesmas credenciais.
    4.  Após a autenticação bem-sucedida, uma sessão é estabelecida, e o `userId` persistente fica disponível para toda a aplicação. O `username` é salvo em um `authStore` (Zustand) para acesso global.
-   **Resultado:** O jogador é redirecionado para a tela principal (`HomeScreen.tsx`) com uma identidade estabelecida, sem nunca ter passado por um fluxo de registro tradicional com confirmação de e-mail e senha.

## 2. Fase II: A Gênese do Mundo (Criação de Campanha)

Aqui, o jogador atua como um parceiro criativo da IA para definir as fundações de sua aventura.

-   **Tela:** `CreateCampaignScreen.tsx`
-   **Funcionalidade: Definição das Sementes Criativas**
    1.  O jogador preenche um formulário com os 4 parâmetros fundamentais: Gênero, Adjetivo ao Mundo, Local Inicial e Época.
    2.  O jogador pode escrever "Declarações" — verdades absolutas sobre o mundo — que servirão como diretrizes criativas para a IA.
    3.  **Fluxo do "Jogador Explorador":** Uma opção de "Gerar Rascunho" permite ao jogador pedir uma sugestão criativa para a IA, que preenche o formulário com uma ideia inicial.
-   **Tela:** `CampaignLoadingScreen.tsx`
-   **Funcionalidade: A IA Arquiteta em Ação**
    1.  Ao clicar em "Concluir", a UI navega para uma tela de carregamento que exibe mensagens narrativas sobre a criação do mundo.
    2.  Nos bastidores, o componente aciona o `services/ai/campaignGeneratorService.ts`.
    3.  Este serviço envia as sementes criativas do jogador para a **"IA Arquiteta"**. A chamada à API é feita com um `responseSchema` massivo e rigoroso, definido diretamente no serviço, que força a IA a retornar uma resposta JSON completa e estruturada.
    4.  O serviço então "traduz" o JSON recebido, populando um objeto `GameState` inicial com `plotDetails`, NPCs (`companions`, `npcs`), `missions`, `locations`, `lore` e as cenas iniciais (`keyScenes`).
    5.  Este `GameState` rico é usado para hidratar o `useGameStore`.
    6.  Finalmente, o `campaign.service.saveCampaign()` é chamado. Este serviço executa uma série de operações `upsert` e `delete` em uma ordem específica para persistir atomicamente toda a campanha recém-nascida no Supabase, incluindo a geração e salvamento dos `embeddings` vetoriais para cada pedaço de conhecimento, preparando a memória de longo prazo.
-   **Resultado:** O jogador é redirecionado para a criação do personagem, com a confiança de que um mundo rico e coeso foi construído sob medida para ele.

## 3. Fase III: O Nascimento do Herói (Criação de Personagem)

Nesta fase, a identidade do protagonista é forjada, com uma filosofia de design que conecta intimamente a narrativa à mecânica do jogo.

-   **Tela:** `CreateCharacterScreen.tsx`
-   **Funcionalidade: "Mecânica Primeiro"**
    1.  **Economia de Pontos:** A criação mecânica é um sistema fechado. O jogador seleciona **Desvantagens** de uma lista (`traits` com `type: 'disadvantage'`). Cada desvantagem escolhida concede 1 ponto para gastar em uma **Vantagem** (`traits` com `type: 'advantage'`).
    2.  **Cálculo Automático dos Elementos:** Os atributos primários do personagem — os 4 **Elementos** (Fogo, Água, Ar, Terra) — não são distribuídos manualmente. Eles são **calculados automaticamente** pelo sistema (`characterUtils.ts`). O valor de cada Elemento é `1 (base) + número de Vantagens` associadas a ele. Isso garante balanceamento e uma conexão direta entre o conceito do personagem (suas vantagens) e sua eficácia mecânica.
    3.  **Definição do Conflito Interno:** O jogador define a força motriz de sua jornada pessoal: um **Objetivo Principal** grandioso e um **Segredo** perigoso que pode ser usado contra ele.
-   **Resultado:** O jogador entra no jogo com um personagem que é, ao mesmo tempo, narrativamente rico e mecanicamente sólido, com suas habilidades sendo uma consequência direta de suas virtudes e falhas.

## 4. Fase IV: A Aventura Contínua (O Loop de Jogo)

Esta é a fase central da experiência Arcana, onde o jogador interage com o mundo e evolui dentro dele.

-   **Tela:** `GameRoomScreen.tsx`
-   **Funcionalidade: O Loop de Interação**
    1.  O jogador insere suas ações como comandos de texto em linguagem natural na `PlayerInputBar.tsx`.
    2.  O `gameMasterService.ts` orquestra a resposta, envolvendo a **"IA Mestre"**. A IA pode responder com narração direta ou invocar ferramentas do `engineService.ts` (O Juiz) para mediar as regras.
    3.  Os resultados são exibidos na `ChatDisplay.tsx`.
-   **Funcionalidade: O Loop de Progressão ("A Trilha do Aventureiro")**
    1.  **Julgamento da IA:** Para cada ação do jogador, a IA Mestre faz um julgamento interno: "Esta ação aproxima o jogador de seu **Objetivo Principal**?"
    2.  **Concessão de Recompensa:** Se a resposta for positiva, a IA invoca uma ferramenta para conceder **Pontos de Progresso**.
    3.  **Avanço na Trilha:** Os pontos preenchem um componente visual (`ProgressTrack.tsx`), que consiste em 10 marcos. Cada marco requer 4 pontos para ser completado.
    4.  **Evolução Mecânica:** A cada marco completado na trilha, o campo `unspent_element_points` do personagem no `useGameStore` é incrementado em +1.
    5.  **Aumento de Poder:** O jogador pode então gastar este ponto na sua ficha de personagem (`CharacterSheet.tsx`) para aumentar permanentemente um de seus 4 Elementos, tornando-se mecanicamente mais poderoso como resultado direto de seu avanço na história.
-   **Resultado:** Um ciclo virtuoso é criado onde o engajamento narrativo é a única forma de progressão mecânica, fundindo a história e as regras em uma única experiência coesa. O jogador sente, de forma tangível, que a jornada de seu herói o está moldando.