# 03 - As Duas IAs: Arquiteta e Mestre

**Propósito:** Este documento detalha as duas implementações distintas de Inteligência Artificial que operam no Arcana V3. Cada IA tem um propósito, um ciclo de vida e um conjunto de responsabilidades únicos. Compreender a distinção entre a "Arquiteta" e o "Mestre" é fundamental para entender o fluxo de geração e narração de histórias da plataforma.

---

## 1. A IA Arquiteta: A Gênese do Mundo

A IA Arquiteta é a força criativa inicial. Ela atua como uma roteirista e mestre de worldbuilding, cujo único trabalho é forjar a fundação de toda a aventura em um único e poderoso ato de criação.

### 1.1. Perfil e Ciclo de Vida

-   **Persona:** Roteirista de RPG Mestre, especialista em criar tramas coesas e mundos intrigantes.
-   **Ciclo de Vida:** Executada **uma única vez por campanha**, durante a `CampaignLoadingScreen`. Ela não possui memória de longo prazo entre campanhas; cada criação é um ato isolado e autocontido.
-   **Serviço Responsável:** `services/ai/campaignGeneratorService.ts`.

### 1.2. Processo Operacional Detalhado

A operação da IA Arquiteta é um processo linear e determinístico:

1.  **Input (Sementes Criativas):** O `campaignGeneratorService` recebe os parâmetros definidos pelo jogador: `genre`, `worldAdjective`, `location`, `era`, a lista de `declarations` e o `companionCount`.
2.  **Construção do Prompt e Schema:** O serviço busca o prompt `GENESIS_PROMPT_TEMPLATE`. Ele constrói dinamicamente um conjunto de "Ordens Diretas" (ex: "Você DEVE criar exatamente 2 companheiros.") e as injeta no template. Crucialmente, ao chamar a API do modelo de linguagem, o serviço anexa um `responseSchema` massivo e rigoroso, definido localmente no serviço. Este schema espelha a estrutura completa de dados necessária para popular a campanha.
3.  **Invocação com Saída Estruturada:** A chamada à IA é feita utilizando a funcionalidade de **Saída Estruturada (Structured Output)**. Isso força o modelo de linguagem a responder não com texto, mas com um objeto JSON puro, garantido para estar em conformidade com o schema fornecido. Este passo elimina a necessidade de analisar strings e previne erros de formatação, garantindo uma resposta 100% confiável.
4.  **Output (O JSON do Mundo):** A IA retorna um grande objeto JSON contendo toda a estrutura da campanha: `plotDetails`, `companions`, `npcs`, `locations`, `missions`, `lore` e `keyScenes`.

### 1.3. O Propósito da Arquiteta

A existência da IA Arquiteta como uma entidade separada resolve um problema fundamental: a coerência de longo prazo. Um modelo de linguagem em tempo real (como a IA Mestre) é bom em manter a coerência de curto e médio prazo, mas pode "se perder" em uma trama que se estende por dezenas de horas.

Ao gerar o "JSON do Mundo" no início, a IA Arquiteta cria a **fonte da verdade canônica** para a história. A IA Mestre, então, não precisa inventar a trama principal em tempo real; seu trabalho é **interpretar e revelar criativamente** a trama que a Arquiteta já estabeleceu, usando-a como seu mapa e guia.

## 2. A IA Mestre: A Consciência do Jogo

A IA Mestre é a entidade com a qual o jogador interage diretamente. Ela é o narrador, o árbitro e o ator que dá vida ao mundo criado pela Arquiteta.

### 2.1. Perfil e Ciclo de Vida

-   **Persona:** Mestre de Jogo de RPG imersivo, justo e reativo. Fala em segunda pessoa ("Você vê...", "Você sente...").
-   **Ciclo de Vida:** Ativa e persistente durante toda a campanha, desde a primeira cena até a última. Seu estado de conhecimento (através da Memória Dupla) evolui junto com o jogador.
-   **Serviço Responsável:** `services/ai/narratorService.ts`.

### 2.2. Processo Operacional Detalhado

O trabalho da IA Mestre é um ciclo contínuo de raciocínio e resposta, orquestrado pelo `narratorService` e `gameMasterService`:

1.  **Input:** A cada turno, o serviço reúne o contexto necessário para a IA:
    -   A **ação do jogador**.
    -   A **Memória de Curto Prazo** (o histórico da sessão de chat).
    -   Opcionalmente, o **resultado de uma chamada de ferramenta** anterior (a resposta do Juiz).
    -   Opcionalmente, **conhecimento recuperado da Memória de Longo Prazo** através da ferramenta de busca RAG.
2.  **Prompt e Ferramentas:** O `narratorService` mantém uma sessão de chat stateful (`ai.chats.create`). Esta sessão é inicializada com o `NARRATOR_SYSTEM_INSTRUCTION`, que define a persona da Mestre e, crucialmente, declara a lista de **Ferramentas (Tools)** que ela pode usar. Essas ferramentas são a sua interface com o "Juiz" (`engineService.ts`).
3.  **Raciocínio e Decisão (Ciclo de Complexidade Adaptativa):**
    -   **Nível 1 (Narração Simples):** Se a ação pode ser resolvida narrativamente, a IA retorna texto.
    -   **Nível 2 (Invocação de Ferramenta):** Se a ação exige uma regra (combate, teste de habilidade, sorteio de carta), a IA retorna uma chamada de ferramenta.
    -   **Nível 3 (Busca de Conhecimento):** Se a IA precisa de informações que não possui (ex: "Lembrar o segredo do Duque"), ela retorna uma chamada para a ferramenta `query_knowledgeBase`. O sistema então recupera a informação e a fornece à IA em um ciclo subsequente, enriquecendo seu contexto antes de gerar uma resposta final.
4.  **Output:** A resposta da IA Mestre pode ser de dois tipos:
    -   **Texto:** Narração, diálogo.
    -   **Chamada de Ferramenta:** Um comando para a aplicação executar uma regra ou buscar informações.

### 2.3. O Propósito da Mestre

O papel da IA Mestre é ser a **ponte viva** entre o jogador e o mundo do jogo. Ela transforma o "esqueleto" estático criado pela Arquiteta em uma experiência dinâmica e interativa. Seu propósito é manter o ritmo, a tensão e a imersão, atuando como os olhos, ouvidos e voz do mundo, enquanto respeita fielmente as "leis da física" estabelecidas pelo Juiz.