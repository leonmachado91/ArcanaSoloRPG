# 08 - Tool Calling Architecture: The Language of the Master AI

**Propósito:** Este documento descreve a arquitetura de "Tool Calling" (Chamada de Ferramentas) que a IA Mestre utilizará para interagir com as regras do mundo do jogo. Ele define a "linguagem" que a IA usará para transformar suas decisões narrativas em consequências mecânicas, conectando o "Intérprete" criativo ao "Juiz" determinístico.

---

## 1. O Conceito Fundamental: Uma API para o Jogo

Para garantir que o jogo seja justo, consistente e livre de "alucinações" da IA, a IA Mestre não tem permissão para inventar resultados de regras. Em vez disso, a aplicação expõe um conjunto de "ferramentas" seguras e especializadas que a IA pode invocar.

Quando uma ação do jogador exige a aplicação de uma regra (um teste de habilidade, a aplicação de dano, a descoberta de um item), a IA Mestre não narra o resultado diretamente. Em vez disso, ela pausa sua narração e faz uma solicitação estruturada para a aplicação (o Juiz) usando uma das ferramentas definidas. A aplicação executa a regra, retorna o resultado mecânico, e a IA Mestre então usa esse resultado para construir sua narração final.

## 2. A Gramática da IA: Intenção -> Alvo -> Ação

Para que a IA possa se comunicar de forma eficaz e escalável, sua "linguagem" de ferramentas é estruturada em uma gramática de três partes, refletida na nomenclatura de cada ferramenta: **`intenção.alvo.ação`**.

-   **Intenção:** O verbo de alto nível que define o objetivo da IA. Existem apenas três intenções principais:
    1.  **`roll`:** Usada para resolver qualquer situação que envolva aleatoriedade ou chance.
    2.  **`query`:** Usada para buscar informações e conhecimento, seja da memória da campanha ou das regras do jogo.
    3.  **`modify`:** Usada para alterar o estado do mundo do jogo (adicionar, remover ou atualizar qualquer entidade).

-   **Alvo:** O substantivo que define sobre *o quê* a IA quer agir (ex: `character`, `item`, `scene`).

-   **Ação:** O verbo específico que define *o que* a IA quer fazer com o alvo (ex: `difficultyCheck`, `applyCondition`, `createAndGive`).

Essa estrutura cria uma API clara, previsível e segura, forçando a IA a um raciocínio lógico antes de agir.