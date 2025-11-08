# 05 - Game Engine Rules: A "Física" do Mundo

**Propósito:** Este documento detalha as regras mecânicas que governam o sistema de RPG do Arcana. Esta é a "física" do mundo, implementada no `engineService.ts` (O "Juiz") e invocada pela IA Mestre (O "Intérprete") através de ferramentas. Estas regras são imutáveis e aplicadas de forma determinística pelo código.

---

## 1. O Sistema Central: Os 4 Elementos

Os atributos de todos os personagens no Arcana são representados por quatro Elementos. Cada Elemento governa um domínio específico de ação e é a base para a maioria dos testes de habilidade.

-   **Fogo:** Representa a força física, agilidade e confronto direto. Associado a Ações (FOR/DES).
-   **Água:** Representa a percepção, intuição e emoção. Associado à Percepção (PER).
-   **Ar:** Representa o intelecto, a comunicação e a astúcia. Associado ao Intelecto (INT/SAB/CAR).
-   **Terra:** Representa a resiliência, a defesa e os recursos. Associado à Resistência (CON/RES).

A pontuação de um personagem em um Elemento é **calculada, não distribuída**. A fórmula é:
`Pontuação do Elemento = 1 (base) + Número de Vantagens relacionadas a esse Elemento`

## 2. Testes de Habilidade

Testes de habilidade são realizados quando um personagem tenta uma ação cujo resultado é incerto.

### 2.1. Testes de Dificuldade

-   **Mecânica:**
    1.  O Intérprete (IA) determina a ação e o Elemento relevante, e estabelece um número de **Dificuldade**.
    2.  O Juiz (`engineService.performDifficultyCheck`) é invocado.
    3.  O jogador rola uma quantidade de dados de 6 lados (d6) igual à sua pontuação no **Elemento** relevante.
    4.  **Sucesso** ocorre se a soma dos resultados dos dados for **maior** que a Dificuldade. Qualquer outro resultado é uma Falha.
-   **Exemplo:** Um personagem com Fogo 3 tenta saltar um abismo (Dificuldade 12). Ele rola 3d6. Se a soma for 13 ou mais, ele tem sucesso.

### 2.2. Ação Contestada (Combate e Interação Social)

-   **Mecânica:**
    1.  Dois ou mais personagens estão em oposição direta.
    2.  O Intérprete determina as ações e os Elementos relevantes para o atacante e o defensor (ex: Fogo para atacar, Terra para defender; Ar para persuadir, Água para resistir).
    3.  O Juiz (`engineService.performClash`) é invocado.
    4.  Ambos os lados rolam seus respectivos dados de Elemento.
    5.  **Resultado:** O lado com o maior total vence a disputa. Um empate tem consequências contextuais (ex: um contra-ataque em combate).

## 3. O Sistema de Condições (Saúde e Moral)

O estado físico e mental de um personagem é representado por **Condições**, em vez de pontos de vida. Condições são efeitos temporários, positivos ou negativos, aplicados a uma entidade.

-   **Categorias:** Físicas (`Ferido`, `Fortalecido`) e Mentais (`Amedrontado`, `Inspirado`).
-   **Níveis de Intensidade:** Leve, Moderado e Grave.
-   **Mecânica de Aplicação:** Quando um personagem sofre dano ou um evento significativo, a severidade da Condição é determinada pelo resultado dos **dados de defesa** do alvo durante uma Ação Contestada bem-sucedida pelo atacante.
    -   *Resultados Iguais de 6:* Efeito Mínimo (ex: -1 na próxima defesa).
    -   *Resultados Diferentes:* Condição **Leve**.
    -   *Resultados Iguais (exceto 1 e 6):* Condição **Moderada**.
    -   *Resultados Iguais de 1:* Condição **Grave**.
-   **Duração e Ciclo de Vida:** O `engineService` gerencia a duração das condições.
    -   *Leve:* Desaparece após um número de turnos.
    -   *Moderado e Grave:* Requerem testes periódicos ou ações específicas para serem removidas ou terem sua intensidade reduzida.

## 4. Oráculos e Sorteio de Cartas

Para introduzir aleatoriedade e inspirar a criatividade da IA, o sistema utiliza Oráculos e um baralho de cartas customizado.

### 4.1. As Cartas do Arcana

-   **Conceito:** No início de cada cena, o Juiz sorteia uma carta de cada um dos 4 baralhos para criar um "tema" para a cena.
-   **Baralhos:**
    -   **Verbo:** A ação principal da cena (ex: *Vingar*).
    -   **Tema:** O conceito central (ex: *Mentira*).
    -   **Adjetivo:** Uma qualidade descritiva (ex: *Cruel*).
    -   **Emoção:** O tom emocional (ex: *Devoção*).
-   **Uso:** O Intérprete (IA) recebe essa combinação de quatro palavras e as usa como a semente criativa fundamental para narrar o início e o desenvolvimento da cena.

### 4.2. Tabelas de Oráculo

-   **Conceito:** Tabelas de resultados aleatórios que a IA pode consultar para determinar eventos imprevisíveis (ex: Ação de Combate de um NPC, Classe de Desafio de um encontro).
-   **Mecânica:** A IA invoca uma ferramenta (`engineService.queryOracle`), que rola os dados apropriados (ex: 1d100) e retorna o resultado da tabela correspondente.

## 5. Criação e Progressão de Personagem

As regras para a criação e evolução do personagem jogador estão integradas no motor do jogo.

-   **Criação ("Mecânica Primeiro"):**
    -   **Economia de Pontos:** Cada **Desvantagem** escolhida concede 1 ponto para gastar em uma **Vantagem**. As vantagens/desvantagens estão catalogadas na tabela `traits`.
-   **Progressão ("A Trilha do Aventureiro"):**
    -   **Gatilho:** A IA concede **Pontos de Progresso** quando o jogador realiza ações alinhadas com seu **Objetivo Principal**.
    -   **Mecânica:** A Trilha de Progresso é composta por 10 marcos. Cada marco requer 4 pontos de progresso.
    -   **Recompensa:** Ao completar um marco, o Juiz incrementa `unspent_element_points` do personagem em +1, permitindo que ele aumente permanentemente a pontuação de um Elemento.