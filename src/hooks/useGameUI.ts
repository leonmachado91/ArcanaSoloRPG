// hooks/useGameUI.ts
import { useState, useCallback } from 'react';
import { Character } from '../types/character';

/**
 * Hook `useGameUI`
 * Gerencia todo o estado volátil da interface do usuário para a GameRoomScreen,
 * como a visibilidade de modais, drawers e seleções.
 * @returns Um objeto contendo os estados da UI e as funções para manipulá-los.
 */
export const useGameUI = () => {
    // Estado para o drawer do menu principal da campanha
    const [isMenuOpen, setMenuOpen] = useState(false);
    
    // Estado para rastrear qual personagem está sendo exibido na ficha completa
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    // Estado para o toggle de mensagens "fora do personagem"
    const [isOff, setIsOff] = useState(false);

    /**
     * Define o personagem a ser exibido na ficha completa.
     */
    const openCharacterSheet = useCallback((character: Character) => {
        setSelectedCharacterId(character.id);
    }, []);

    /**
     * Fecha a ficha de personagem completa.
     */
    const closeCharacterSheet = useCallback(() => {
        setSelectedCharacterId(null);
    }, []);

    // Retorna todos os estados e manipuladores para serem consumidos pelo orquestrador.
    return {
        isMenuOpen,
        setMenuOpen,
        selectedCharacterId,
        openCharacterSheet,
        closeCharacterSheet,
        isOff,
        setIsOff,
    };
};
