# O Esqueleto Narrativo - Visão Geral

Para cada nova campanha, a IA Arquiteta deverá gerar uma estrutura narrativa completa e coesa. Essa estrutura é a "Bíblia da Campanha", a fonte da verdade imutável que guiará a IA Mestre. Ela é dividida em dois grandes capítulos: a **Trama Central**, que define o "o quê" da história; e os **Elementos Fundamentais**, que definem o "quem" e o "onde".

### **Capítulo 1: A Trama Central**

Este capítulo descreve o arco dramático da campanha. Ele é composto por três partes: o conflito principal, o roteiro da história e os mistérios que a permeiam.

**1.1. O Conflito Central**

- **O Que É:** Uma descrição concisa do principal motor de tensão da campanha. É a luta ou o problema fundamental que o jogador precisará resolver. Ele introduz o tom da aventura desde o início.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `campaign_lore`
> - **Mecanismo:** Será salvo como uma única entrada. A coluna `category` será preenchida com o valor `'Conflito Central'`, e a descrição completa irá para a coluna `content`. Este `content` será **vetorizado** e salvo na coluna `embedding`, permitindo que a IA Mestre busque o conceito central da campanha a qualquer momento via RAG.

**1.2. O Roteiro da História (Estrutura Narrativa)**

- **O Que É:** Um resumo dos eventos passados e de como a trama se desenrolará, garantindo que a campanha tenha um arco narrativo satisfatório, com início, meio e fim. É o mapa secreto do Mestre.
    - **O Passado:** Um resumo dos eventos cruciais que aconteceram antes do início do jogo e que levaram à situação atual.
    - **A Situação Atual:** Uma fotografia do *status quo*. Como o mundo está, e qual é a situação imediata do jogador (mesmo que ele não saiba de tudo)?
    - **O Chamado para a Aventura:** O evento ou gatilho específico que tira o jogador de sua zona de conforto e o empurra para a trama principal.
    - **Resumo do Objetivo Principal:** Uma visão geral do que precisa ser alcançado para "resolver" o Conflito Central.
    - **Os Principais Desafios:** **Uma série de mini-arcos narrativos distintos que formam o corpo principal da campanha.** Cada desafio representa um momento significativo na jornada, com seus próprios objetivos, antagonistas, dilemas e consequências. A IA deve gerar vários desses desafios para dar profundidade e progressão à trama.
    - **A Grande Reviravolta (Plot Twist):** O momento chocante ou a revelação que mudará fundamentalmente a percepção do jogador sobre a história e seus objetivos.
    - **O Climax:** A descrição da confrontação ou do evento final onde o jogador enfrenta o desafio principal.
    - **O Legado:** As consequências da vitória ou derrota. O que acontece depois do clímax? Como o mundo e o personagem mudaram?

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `campaign_lore`
> - **Mecanismo:** Para máxima eficiência da RAG, a maioria dos itens do roteiro será salva como uma **entrada separada** (`'Roteiro - O Passado'`, `'Roteiro - O Climax'`, etc.). **Crucialmente, cada um dos "Principais Desafios" gerados também será uma entrada individual**, formatada como `'Roteiro - Desafio 1: [Título do Desafio]'`, `'Roteiro - Desafio 2: [Título do Desafio]'`, etc. Isso permite que a IA Mestre recupere e foque em um arco de história específico por vez. Todos os registros serão **vetorizados individualmente**.

**1.3. Os Mistérios da Trama**

- **O Que É:** A teia de segredos e enigmas que o jogador precisará desvendar para entender completamente a história. Os mistérios são o motor da investigação e da exploração.
    - **As Pistas:** Informações, objetos ou eventos que ajudam a resolver o mistério. Elas podem ser encontradas em cenários, em conversas com NPCs ou como resultado de ações.
    - **As Pistas Falsas (Red Herrings):** Informações deliberadamente enganosas que levam a becos sem saída, criadas para confundir e aprofundar o desafio da investigação.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `campaign_lore`
> - **Mecanismo:** Cada mistério principal será uma entrada com `category: 'Mistério - [Título do Mistério]'`. Cada pista (verdadeira ou falsa) será uma entrada separada, com `category: 'Pista - [Título do Mistério Associado]'` e um `content` que especifica seu conteúdo e se é enganosa. Todos esses registros serão **vetorizados**, criando uma teia de conhecimento pesquisável.

---

### **Capítulo 2: Os Elementos Fundamentais**

Este capítulo dá vida à trama, populando o mundo com as "coisas" concretas com as quais o jogador irá interagir.

**2.1. Cenas Chave**

- **O Que São:** **Um conjunto estruturado de cenas que define o esqueleto do arco narrativo da campanha.** A IA deve gerar uma base para cada uma dessas cenas, que servirá como um guia direcional para a IA Mestre.
    - **Cena Inicial:** A introdução. Sempre começa com suspense, onde o jogador se encontra em uma situação desconhecida.
    - **Cenas Importantes (2 a 3):** Cenas que representam os momentos cruciais da trama, geralmente ligadas à conclusão de um dos "Principais Desafios".
    - **Cenas Complementares (Opcional, 1 a 2):** Cenas menores que podem explorar subtramas, desenvolver personagens ou apresentar missões secundárias.
    - **Cena Final (Base):** Uma base para a conclusão da campanha, ligada diretamente ao "Clímax" do roteiro. Ela fornece um ponto de chegada claro para a IA Mestre, mesmo que os detalhes mudem drasticamente com as ações do jogador.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `scenes`
> - **Mecanismo:** Cada cena gerada (Inicial, Importante, Final, etc.) se tornará uma nova linha na tabela `scenes`, preenchendo `title` e `description`. Elas serão ordenadas pelo `scene_number`, com a Cena Inicial tendo `scene_number: 1` e `is_active: true`. As outras cenas terão números sequenciais, mas `is_active: false`. A `description` de cada cena será **vetorizada**. O "tipo" da cena (Inicial, Final, etc.) será parte do `title` ou `description` para dar contexto à IA Mestre.

**2.2. Missões Iniciais**

- **O Que São:** Uma lista dos primeiros objetivos concretos para o jogador, divididos por importância.
    - **Missão Principal:** O primeiro passo claro na jornada para resolver o Conflito Central.
    - **Missão Secundária (Opcional):** Uma missão menor que pode apresentar um local, um NPC ou um elemento do lore de forma mais contida.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `quests`
> - **Mecanismo:** Cada missão se tornará uma nova linha na tabela `quests`, mapeando diretamente `title` e `description`. O `status` será definido como `'available'`. Um campo adicional (ex: `is_main_quest: boolean`) será usado para diferenciar os tipos. A `description` da missão será **vetorizada**.

**2.3. Personagens-Chave**

- **O Que São:** As figuras centrais que irão interagir com o jogador, com personalidades e objetivos próprios.
    - **Companheiros:** NPCs importantes destinados a acompanhar o jogador em partes significativas de sua jornada.
    - **NPCs Importantes:** Personagens que movem a história, mesmo que não viajem com o jogador. Cada um deve ter:
        - **Arquétipo:** Sua função na história (Vilão, Mentor, Arauto, etc.).
        - **Relevância na Trama:** Uma explicação clara de como eles se conectam ao Conflito Central ou aos Mistérios.
        - **Segredo:** Uma informação oculta sobre eles.
        - **Objetivo:** O que este NPC quer alcançar.
        - **História de Fundo:** Um breve resumo de seu passado.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabelas:** `entities` e `characters`
> - **Mecanismo:** Este é um processo de duas etapas. Para cada personagem gerado: 1) Uma linha é criada na tabela `entities` com `type: 'character'`. 2) O `id` dessa entidade é usado para criar a linha correspondente na tabela `characters`, preenchendo todos os campos: `name`, `description`, `archetype`, `secret`, `objective`, `history`, etc. Um "documento" combinado de todas as informações textuais do personagem será **vetorizado** e salvo na coluna `sheet_embedding`, criando uma ficha completa e pesquisável para a RAG.

**2.4. Itens-Chave**

- **O Que São:** Objetos importantes para a trama.
    - **Item de Missão:** Um item que é necessário para completar uma missão ou resolver um mistério.
    - **Item Comum:** Itens que podem ser úteis ou interessantes, mas não são críticos para o avanço da história.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `items`
> - **Mecanismo:** Cada item gerado se tornará uma nova linha na tabela de catálogo `items`, mapeando `name` e `description`. A `description` será **vetorizada**, permitindo ao Mestre entender o propósito do item.

**2.5. Locais-Chave**

- **O Que São:** Os principais cenários onde a história se desenrolará. Para cada local:
    - **Descrição:** Como é o local, sua atmosfera.
    - **História:** O passado e a importância do local.
    - **Relevância na Trama:** Por que este local é importante para a história principal.

> Como e Onde isso será Populado no Supabase:
> 
> - **Tabela:** `campaign_lore`
> - **Mecanismo:** Cada local será salvo como uma entrada separada. A `category` será formatada como `'Local - [Nome do Local]'`. O `content` da entrada combinará `Descrição`, `História` e `Relevância na Trama`. Este `content` agregado será **vetorizado**, tratando cada local como um documento rico e pesquisável.