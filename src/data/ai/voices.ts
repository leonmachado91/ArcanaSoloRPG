// data/ai/voices.ts
// Este arquivo contém a lista de vozes de Text-to-Speech (TTS) disponíveis na API Gemini,
// bem como a lógica para selecionar uma voz apropriada para um personagem com base
// em seus traços de personalidade e gênero.

import { Character } from "../../types/character";
import { getConfig } from "../../services/configService";

/**
 * Interface que define a estrutura de uma voz TTS.
 */
export interface Voice {
    /** Nome usado na API (ex: 'Puck'). */
    name: string;
    /** Nome amigável para a UI (ex: 'Puck (Animado, Masculina)'). */
    label: string;
    /** Gênero associado à voz. */
    gender: 'male' | 'female' | 'neutral';
    /** Palavras-chave em português que descrevem o tom da voz, usadas para correspondência. */
    tags: string[];
}

/**
 * Lista completa de vozes Gemini TTS, baseada na documentação da API.
 * Cada voz é enriquecida com metadados (gênero, tags) para permitir a seleção automática.
 */
export const VOICES: Voice[] = [
    { name: 'Achernar', label: 'Achernar (Suave, Feminina)', gender: 'female', tags: ['suave', 'gentil', 'calmo'] },
    { name: 'Achird', label: 'Achird (Firme, Masculina)', gender: 'male', tags: ['firme', 'confiante', 'sério'] },
    { name: 'Algenib', label: 'Algenib (Grave, Masculina)', gender: 'male', tags: ['grave', 'profundo', 'sério', 'vilão'] },
    { name: 'Algieba', label: 'Algieba (Suave, Masculina)', gender: 'male', tags: ['suave', 'gentil', 'calmo'] },
    { name: 'Alnilam', label: 'Alnilam (Firme, Masculina)', gender: 'male', tags: ['firme', 'confiante', 'sério', 'guerreiro'] },
    { name: 'Aoede', label: 'Aoede (Alegre, Feminina)', gender: 'female', tags: ['alegre', 'animado', 'jovem'] },
    { name: 'Autonoe', label: 'Autonoe (Brilhante, Feminina)', gender: 'female', tags: ['brilhante', 'claro', 'jovem', 'energético'] },
    { name: 'Callirrhoe', label: 'Callirrhoe (Tranquila, Feminina)', gender: 'female', tags: ['tranquilo', 'calmo', 'suave'] },
    { name: 'Charon', label: 'Charon (Informativa, Masculina)', gender: 'male', tags: ['informativo', 'claro', 'narrador', 'sério'] },
    { name: 'Despina', label: 'Despina (Suave, Feminina)', gender: 'female', tags: ['suave', 'gentil', 'calmo', 'jovem'] },
    { name: 'Enceladus', label: 'Enceladus (Ofegante, Masculina)', gender: 'male', tags: ['ofegante', 'rápido', 'ansioso', 'assustado'] },
    { name: 'Erinome', label: 'Erinome (Clara, Feminina)', gender: 'female', tags: ['claro', 'confiante', 'jovem'] },
    { name: 'Fenrir', label: 'Fenrir (Excitável, Masculina)', gender: 'male', tags: ['excitável', 'energético', 'animado', 'jovem'] },
    { name: 'Gacrux', label: 'Gacrux (Maduro, Masculina)', gender: 'male', tags: ['maduro', 'velho', 'sério', 'sábio'] },
    { name: 'Iapetus', label: 'Iapetus (Clara, Masculina)', gender: 'male', tags: ['claro', 'confiante', 'jovem', 'heroico'] },
    { name: 'Kore', label: 'Kore (Firme, Feminina)', gender: 'female', tags: ['firme', 'confiante', 'sério', 'líder'] },
    { name: 'Laomedeia', label: 'Laomedeia (Animada, Feminina)', gender: 'female', tags: ['animado', 'alegre', 'jovem', 'energético'] },
    { name: 'Leda', label: 'Leda (Jovem, Feminina)', gender: 'female', tags: ['jovem', 'inocente', 'alegre', 'doce'] },
    { name: 'Orus', label: 'Orus (Firme, Masculina)', gender: 'male', tags: ['firme', 'confiante', 'sério', 'nobre'] },
    { name: 'Puck', label: 'Puck (Animado, Masculina)', gender: 'male', tags: ['animado', 'heroico', 'jovem', 'aventureiro'] },
    { name: 'Pulcherrima', label: 'Pulcherrima (Direta, Feminina)', gender: 'female', tags: ['direto', 'firme', 'sério'] },
    { name: 'Rasalgethi', label: 'Rasalgethi (Informativa, Masculina)', gender: 'male', tags: ['informativo', 'claro', 'narrador', 'calmo'] },
    { name: 'Sadachbia', label: 'Sadachbia (Voz Masculina)', gender: 'male', tags: ['neutro', 'masculino', 'comum'] },
    { name: 'Sadaltager', label: 'Sadaltager (Voz Masculina)', gender: 'male', tags: ['neutro', 'masculino', 'comum'] },
    { name: 'Schedar', label: 'Schedar (Equilibrada, Feminina)', gender: 'female', tags: ['equilibrado', 'calmo', 'neutro', 'narrador'] },
    { name: 'Sulafat', label: 'Sulafat (Voz Feminina)', gender: 'female', tags: ['neutro', 'feminino', 'comum'] },
    { name: 'Umbriel', label: 'Umbriel (Tranquila, Masculina)', gender: 'male', tags: ['tranquilo', 'calmo', 'suave'] },
    { name: 'Vindemiatrix', label: 'Vindemiatrix (Voz Feminina)', gender: 'female', tags: ['neutro', 'feminino', 'comum'] },
    { name: 'Zephyr', label: 'Zephyr (Brilhante, Masculina)', gender: 'male', tags: ['brilhante', 'claro', 'jovem', 'narrador'] },
    { name: 'Zubenelgenubi', label: 'Zubenelgenubi (Voz Masculina)', gender: 'male', tags: ['neutro', 'masculino', 'comum'] },
];

/**
 * Seleciona heuristicamente uma voz apropriada para um personagem com base em seu gênero e traços.
 * @param character O objeto do personagem para o qual selecionar uma voz. Se não for fornecido, retorna a voz padrão do mestre.
 * @returns O nome da voz da API (ex: 'Puck').
 */
export const getVoiceForCharacter = (character?: Character): string => {
    const defaultMasterVoice = getConfig().ai.defaultMasterVoice;

    if (!character) {
        return defaultMasterVoice;
    }

    // Combina a descrição e os traços de personalidade em um texto para busca de tags.
    const characterText = `${character.description} ${character.personalityTraits.join(' ')}`.toLowerCase();
    const gender = character.gender || 'neutral'; 

    let bestMatch: Voice | undefined;
    let maxScore = -1;

    // Itera sobre todas as vozes disponíveis para encontrar a melhor correspondência.
    for (const voice of VOICES) {
        // Pula se o gênero for especificado e não corresponder. Vozes neutras podem corresponder a qualquer um.
        if (gender !== 'neutral' && voice.gender !== 'neutral' && voice.gender !== gender) {
            continue;
        }

        let score = 0;
        // Prioriza correspondência de gênero exata.
        if (voice.gender === gender) {
            score += 2;
        }

        // Adiciona pontos para cada tag encontrada na descrição/traços do personagem.
        for (const tag of voice.tags) {
            if (characterText.includes(tag)) {
                score++;
            }
        }
        
        if (score > maxScore) {
            maxScore = score;
            bestMatch = voice;
        }
    }

    // Se nenhuma tag corresponder, seleciona uma voz aleatória do gênero correto como fallback.
    if (!bestMatch) {
        const genderFilteredVoices = VOICES.filter(v => v.gender === gender);
        if (genderFilteredVoices.length > 0) {
            return genderFilteredVoices[Math.floor(Math.random() * genderFilteredVoices.length)].name;
        }
    }

    return bestMatch ? bestMatch.name : defaultMasterVoice;
};
