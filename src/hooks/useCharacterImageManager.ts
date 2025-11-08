// hooks/useCharacterImageManager.ts
import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Character } from '@/types/character';
import { Message } from '@/types/chat';
import { getConfig } from '@/services/configService';
import { formatErrorForDisplay } from '@/types/game';
import { fileToDataUrl } from '@/utils/fileUtils';
import * as characterService from '@/services/db/character.service';
import { useErrorStore } from '@/store/errorStore';

/**
 * Hook `useCharacterImageManager`
 * Gerencia a lógica de upload e geração de imagens para os personagens e cenas.
 * @returns Um objeto contendo os estados e as funções de manipulação de imagem.
 */
export const useCharacterImageManager = () => {
    const dispatch = useGameStore(state => state.dispatch);
    const { showError } = useErrorStore();
    
    // Estado para controlar para qual personagem/mensagem uma imagem está sendo gerada.
    const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

    /**
     * Placeholder para a função de geração de imagem de cena.
     */
    const handleGenerateImage = useCallback(async (message: Message) => {
        // TODO: Implementar a lógica de chamada à API de geração de imagem.
        console.log("Solicitada geração de imagem para a mensagem:", message.id);
        showError("A geração de imagem de cena com IA ainda não foi implementada.");
    }, [showError]);
    
    /**
     * Placeholder para a função de geração de imagem de personagem.
     */
    const handleGenerateCharacterImage = useCallback(async (character: Character) => {
        // TODO: Implementar a lógica de chamada à API de geração de imagem de personagem.
        console.log("Solicitada geração de imagem para o personagem:", character.id);
        showError("A geração de imagem de personagem com IA ainda não foi implementada.");
    }, [showError]);
    
    /**
     * Manipula o upload de um arquivo de imagem para um personagem.
     * @param character O personagem para o qual a imagem está sendo enviada.
     * @param file O arquivo de imagem selecionado pelo usuário.
     */
    const handleUploadCharacterImage = useCallback(async (character: Character, file: File) => {
        setGeneratingImageFor(character.id);
        const config = getConfig();
        try {
            // Validação do tamanho do arquivo.
            const sizeLimit = config.system.characterImageUploadSizeLimitMb;
            if (file.size > sizeLimit * 1024 * 1024) {
                showError(`A imagem é muito grande. O limite é de ${sizeLimit}MB.`);
                setGeneratingImageFor(null);
                return;
            }

            // Converte o arquivo para Data URL para exibição imediata e salvamento.
            const dataUrl = await fileToDataUrl(file);
            
            // Persiste a mudança no banco de dados PRIMEIRO.
            await characterService.updateCharacterData(character.id, { imageUrl: dataUrl });

            // Atualiza o estado local via Zustand DEPOIS.
            dispatch({
                type: 'UPDATE_CHARACTER_DATA',
                payload: { characterId: character.id, data: { imageUrl: dataUrl } }
            });
            
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Um erro desconhecido ocorreu ao fazer upload da imagem.");
            showError(errorMessage);
        } finally {
            setGeneratingImageFor(null);
        }
    }, [dispatch, showError]);

    return {
        generatingImageFor,
        handleGenerateImage,
        handleGenerateCharacterImage,
        handleUploadCharacterImage,
    };
};