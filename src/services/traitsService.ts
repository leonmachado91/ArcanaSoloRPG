// services/traitsService.ts
// Este serviço atua como uma camada de lógica de negócio sobre o `supabaseService`.
// Sua responsabilidade é buscar os dados brutos de Vantagens e Desvantagens e
// transformá-los em uma estrutura agrupada, que é mais conveniente para a renderização
// na tela de criação de personagem.

import { fetchAllTraits } from '@/services/db/catalog.service';
import { TraitDefinition, GroupedTraits } from '../types/character';
import { ELEMENT_GROUP_ORDER } from '../data/rules/traits';

/**
 * Busca todos os traits do Supabase e os organiza em um formato agrupado
 * por tipo (vantagem/desvantagem) e por elemento.
 * @returns Uma promessa que resolve com um objeto contendo os traits agrupados.
 * @throws {AppError} Se a busca no `supabaseService` falhar.
 */
export const fetchTraits = async (): Promise<GroupedTraits> => {
    // Busca a lista plana de traits do serviço do Supabase.
    // O tratamento de erros já é feito dentro do `supabaseService`.
    const allTraits = await fetchAllTraits();
    
    // Inicializa os objetos que irão armazenar os dados agrupados.
    const grouped: GroupedTraits = {
        advantages: {},
        disadvantages: {}
    };

    // Itera sobre todos os traits para separá-los e agrupá-los.
    for (const trait of allTraits) {
        const groupName = ELEMENT_GROUP_ORDER[trait.element];
        
        if (trait.type === 'advantage') {
            // Se o grupo de elemento ainda não existe para vantagens, cria-o.
            if (!grouped.advantages[groupName]) {
                grouped.advantages[groupName] = [];
            }
            grouped.advantages[groupName].push(trait);
        } else if (trait.type === 'disadvantage') {
            // Se o grupo de elemento ainda não existe para desvantagens, cria-o.
            if (!grouped.disadvantages[groupName]) {
                grouped.disadvantages[groupName] = [];
            }
            grouped.disadvantages[groupName].push(trait);
        }
    }
    
    return grouped;
};