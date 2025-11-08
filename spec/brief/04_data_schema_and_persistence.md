# 04 - Data Schema and Persistence

**Propósito:** Este documento detalha a arquitetura de dados e a estratégia de persistência do Arcana V3. Ele descreve a estrutura do banco de dados PostgreSQL no Supabase, a filosofia por trás do schema e os mecanismos que garantem que o estado do jogo seja salvo e carregado de forma robusta e consistente.

---

## 1. O Backend: Supabase

Arcana V3 utiliza o Supabase como seu Backend-as-a-Service. Ele fornece não apenas o banco de dados PostgreSQL, mas também autenticação, armazenamento de arquivos, funções de servidor (Edge Functions) e, crucialmente, suporte para embeddings vetoriais através da extensão `pgvector`. Isso nos permite manter toda a nossa infraestrutura de backend em um único local gerenciado.

## 2. A Filosofia do Schema: "O Schema 10/10"

O design do banco de dados não é um mero repositório de dados; ele é um modelo ativo do mundo do jogo, projetado para ser **modular, extensível e mecanicamente robusto**. A filosofia central que rege o schema é o conceito da **`entity` (entidade)**.

### 2.1. O Conceito de `entity`

Em vez de criar tabelas monolíticas e rígidas (`personagens`, `monstros`, `baus`), o schema introduz uma tabela `entities` abstrata.

-   **`entities` (Tabela Hub):** Esta tabela representa qualquer "coisa" discreta que possa existir no mundo do jogo. Ela contém o `id` (PK, `uuid`), o `campaign_id` para escopo, e um `type` (`player`, `companion`, `npc`) para diferenciação semântica.

Este design permite uma flexibilidade irrestrita. Uma "coisa" no mundo não é definida por sua tabela, mas pelos **componentes** que estão anexados a ela.

### 2.2. O Modelo de Entidade-Componente

As tabelas no schema são categorizadas em três tipos:

1.  **Tabela Hub (`entities`):** O ponto central que define a existência de um objeto no mundo.
2.  **Tabelas de Extensão (Relação 1-para-1):** Anexadas a uma entidade para adicionar dados específicos. Exemplo: a tabela `characters`. Sua chave primária, `entity_id`, é também uma chave estrangeira que aponta para `entities.id`. Isso significa que "todo personagem é uma entidade, mas nem toda entidade é um personagem". Ela armazena dados que *só* fazem sentido para um personagem (ex: `objective`, `progress_points`).
3.  **Tabelas de Componente (Relação 1-para-N):** Podem ser "anexadas" a *qualquer* entidade para lhe conferir comportamentos. Exemplos:
    -   `entity_inventory`: Pode conter itens para uma `entity` do tipo `character` ou `item_container`.
    -   `entity_conditions`: Pode aplicar uma condição a um personagem, um monstro ou até mesmo um objeto inanimado (ex: "Porta Amaldiçoada").

O resultado é um sistema de "peças de Lego" que a IA pode usar para construir um mundo interativo e dinâmico, sem as limitações de um schema rígido.

## 3. A Estratégia de Persistência

A comunicação entre a aplicação cliente e o Supabase é gerenciada por uma camada de serviços dedicados (`services/db/`), com uma estratégia clara para salvar e carregar os dados.

### 3.1. Salvamento Sequencial (`saveCampaign`)

A função `campaign.service.saveCampaign()` é a única fonte de verdade para persistir o estado do jogo. Embora não seja uma transação atômica única (devido à complexidade e ao uso de `Promise.all` para embeddings), ela é projetada para ser robusta, seguindo uma ordem de operações que respeita a integridade referencial do banco de dados.

O processo de salvamento envolve:
1.  **Coleta e Geração de Embeddings:** O serviço lê o `GameState` completo do `useGameStore`. Ele então aciona a geração de `embeddings` para todas as novas entidades de conhecimento (personagens, lore, missões, cenas) em paralelo.
2.  **Tradução (`camelCase` para `snake_case`):** Os utilitários em `dbUtils.ts` convertem os dados do formato do cliente para o formato do banco de dados.
3.  **Operações em Ordem:** A função executa uma série de chamadas `upsert` e `delete` ao Supabase em uma ordem estrita:
    1.  **Entidades "Pai":** `campaigns`, `entities`.
    2.  **Tabelas de Extensão:** `characters`, `scenes`, `quests`, `campaign_lore`.
    3.  **Tabelas de Junção:** `scene_entities`, `chat_history`, `entity_traits`, `entity_conditions`, `entity_inventory`.
    Esta sequência garante que as chaves estrangeiras sempre existam antes de serem referenciadas, prevenindo erros de integridade.

### 3.2. Carregamento Abrangente (`loadCampaign`)

A função `campaign.service.loadCampaign()` é responsável por reconstruir o `GameState` do cliente a partir dos dados do Supabase.

1.  **Consultas em Cascata:** A função executa uma série de consultas `SELECT` sequenciais e paralelas para buscar todos os dados relacionados a uma campanha:
    1.  Busca a campanha principal.
    2.  Busca todas as `entities` associadas.
    3.  Com os `entity_ids`, busca os `characters` e as `scenes`.
    4.  Usa `Promise.all` para buscar em paralelo todas as tabelas de junção (traits, conditions, inventory, chat, etc.).
2.  **Tradução (`snake_case` para `camelCase`):** Os dados retornados do banco de dados são convertidos para o formato esperado pelo cliente.
3.  **Reconstrução do Estado:** A lógica de carregamento cuidadosamente re-hidrata o `useGameStore`, garantindo que todas as relações entre os dados (ex: quem é o autor de qual mensagem) sejam restauradas corretamente.

## 4. O Mapeamento Chave: JSON da Arquiteta para o Schema

Durante a Gênese do Mundo, o `campaignGeneratorService` atua como a ponte entre o JSON criativo da IA Arquiteta e a estrutura relacional do Supabase.

| Elemento do JSON (IA Arquiteta) | Tabela(s) de Destino no Supabase      | Preparado para RAG?                                    |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `plotDetails`                     | `campaign_lore` (com categorias específicas) | **Sim** (cada entrada tem seu `embedding` gerado)      |
| `companions` e `npcs`             | `entities`, `characters`              | **Sim** (cada ficha de personagem tem seu `embedding`) |
| `locations`                     | `locations` (a ser criada) e/ou `campaign_lore` | **Sim** (cada local tem seu `embedding`)               |
| `missions`                      | `quests`                              | **Sim** (cada missão tem seu `embedding`)              |
| `lore`                          | `campaign_lore`                       | **Sim** (cada entrada tem seu `embedding`)             |
| `keyScenes`                     | `scenes`, `scene_entities`            | **Sim** (cada descrição de cena tem seu `embedding`)   |