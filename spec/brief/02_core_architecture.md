# 02 - Core Architecture: Os Pilares da Simulação

**Propósito:** Este documento descreve os conceitos de arquitetura de software mais críticos do Arcana V3. Estes não são sobre a experiência do usuário, mas sobre os padrões de design internos que permitem que essa experiência exista de forma robusta e escalável.

---

## 1. O Princípio Fundamental: A Separação de Poderes (O Juiz vs. O Intérprete)

A espinha dorsal de toda a aplicação é a separação absoluta entre a lógica mecânica e a lógica criativa. Essa divisão é personificada em duas entidades distintas: O Juiz e O Intérprete.

### 1.1. O Que São?

-   **O Juiz (A Aplicação / O Motor de Regras):**
    -   **Componentes:** `engineService.ts`, todos os serviços em `/services/db`, e todas as funções em `/utils`.
    -   **Descrição:** O Juiz é a representação do código, das leis imutáveis e da matemática do universo do jogo. Ele é imparcial, determinístico e completamente desprovido de criatividade. Sua única função é executar as regras do sistema com precisão absoluta quando solicitado. Ele é a **fonte da verdade mecânica**.

-   **O Intérprete (A IA / O Mestre do Jogo):**
    -   **Componentes:** `gameMasterService.ts`, todos os serviços em `/services/ai`, e os Modelos de Linguagem de Grande Escala (LLMs).
    -   **Descrição:** O Intérprete é o diretor, o ator e o contador de histórias. Sua função é operar *dentro* das leis estabelecidas pelo Juiz, usando sua criatividade para dar vida ao mundo, interpretar eventos, incorporar personagens e decidir *quando* as regras do Juiz precisam ser invocadas. Ele é a **fonte da verdade narrativa**.

### 1.2. Por Que Esta Separação é Crucial?

A razão desta separação é resolver o principal desafio de usar IA generativa em um sistema de regras: **LLMs são excelentes contadores de histórias, mas péssimos calculadores e árbitros.**

1.  **Garantia de Consistência e Justiça:** Confiar em um LLM para rolar dados ou calcular modificadores levaria a resultados inconsistentes, "alucinações" matemáticas e uma quebra fatal da confiança do jogador. Ao isolar toda a mecânica no Juiz (código), garantimos que cada regra seja aplicada de forma 100% confiável, sempre.
2.  **Liberação da Criatividade da IA:** Ao remover da IA o fardo de ter que lembrar e computar regras complexas, nós a liberamos para focar no que ela faz de melhor: ser criativa. O prompt da IA não é poluído com a mecânica do jogo; ele apenas precisa saber quais "ferramentas" do Juiz estão disponíveis.
3.  **Manutenibilidade e Depuração Simplificadas:** Esta arquitetura torna a depuração ordens de magnitude mais simples. Se um bônus de personagem está errado, o bug está no código do **Juiz**. Se a narração do Mestre contradiz o resultado de uma rolagem de dados, o problema está no prompt ou na lógica do **Intérprete**.

### 1.3. Como Eles Interagem? O Ciclo de Chamada de Ferramentas (Tool Calling)

A comunicação entre o Juiz e o Intérprete é um ciclo de solicitação e resposta, orquestrado pelo `gameMasterService.ts` através da funcionalidade de **Tool Calling**:

1.  A ação do jogador é enviada para o Intérprete (IA).
2.  O Intérprete, em seu raciocínio, determina que uma ação requer uma regra (ex: um teste de dificuldade).
3.  A IA responde não com texto, mas com uma **chamada de ferramenta** estruturada (ex: `{ tool_call: { name: 'performDifficultyCheck', arguments: {...} } }`).
4.  O `gameMasterService` intercepta esta chamada e invoca a função correspondente no `engineService.ts` (O Juiz).
5.  O Juiz executa a regra de forma determinística e retorna um resultado mecânico estruturado (ex: `{ outcome: 'SUCCESS', roll: 15 }`).
6.  O `gameMasterService` envia este resultado de volta para o Intérprete com uma nova instrução: "Aqui está o resultado da ferramenta. Agora, narre as consequências."
7.  O Intérprete, com a verdade mecânica em mãos, gera a narração final e criativa.

## 2. O Mecanismo de Continuidade: A Memória Dupla

Para criar um mundo que se sente vivo e reativo, a IA Mestre precisa de uma memória eficaz. O Arcana implementa um sistema de memória de duas camadas para resolver os desafios de janelas de contexto limitadas e da necessidade de recuperação de informações relevantes.

### 2.1. O Que São?

-   **Memória de Curto Prazo (Contexto Ativo):**
    -   **Implementação:** As últimas N mensagens da tabela `chat_history`.
    -   **Descrição:** É a memória de trabalho, volátil e imediata. Contém o fluxo da conversa e os eventos da cena atual. É o que permite que a "conversa" com a IA seja fluida e coerente.

-   **Memória de Longo Prazo (Conhecimento da Campanha):**
    -   **Implementação:** O conteúdo das tabelas `campaign_lore`, `characters`, `quests`, etc., com seus `embeddings` vetoriais.
    -   **Descrição:** É a "enciclopédia" consolidada e permanente da campanha. Armazena os eventos mais importantes, os segredos revelados e os detalhes dos personagens, despojada do ruído das interações triviais.

### 2.2. Por Que Duas Memórias?

1.  **Resolver a Limitação de Contexto:** É impossível (e proibitivamente caro) enviar o histórico inteiro de uma campanha longa para a IA a cada turno. A **Memória de Curto Prazo** garante a fluidez da cena atual sem exceder os limites de tokens da IA.
2.  **Permitir a Busca Inteligente:** Uma longa transcrição cronológica não é uma forma eficiente de encontrar informações. A **Memória de Longo Prazo**, através da tecnologia **RAG (Retrieval-Augmented Generation)**, permite que a IA faça buscas semânticas. Ela pode "perguntar" ao sistema sobre um evento passado, e a busca vetorial encontrará os trechos mais relevantes, não importando quando aconteceram.

### 2.3. Como Funciona o Fluxo de Memória?

1.  **Durante o Jogo:** Para cada ação, o `gameMasterService` anexa a **Memória de Curto Prazo** ao prompt da IA.
2.  **Consolidação (Roadmap Futuro):** A visão de longo prazo para a Memória Dupla inclui um processo de consolidação automática. Ao final de cada cena ou marco narrativo significativo, um processo será acionado para que a IA resuma os eventos-chave ocorridos. Este resumo conciso será então vetorizado e salvo como uma nova entrada na `campaign_lore`, enriquecendo continuamente a memória de longo prazo e permitindo que a IA "aprenda" com o desenrolar da história. Isso diminuirá o volume de tokens necessários para o contexto e aumentará a capacidade da IA de entender a campanha como um todo.
3.  **Indexação:** Durante o salvamento (na Gênese do Mundo), o conteúdo textual é convertido em um vetor numérico (um `embedding`) e salvo junto com os dados.
4.  **Recuperação (RAG):** Quando o Intérprete (IA) precisa de uma informação que não está em sua Memória de Curto Prazo, ele usa uma ferramenta `searchKnowledgeBase`. Esta ferramenta executa uma busca de similaridade vetorial no banco de dados, recupera os trechos de conhecimento mais relevantes e os fornece à IA, enriquecendo seu contexto para a próxima resposta.
