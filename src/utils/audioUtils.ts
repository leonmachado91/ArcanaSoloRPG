// utils/audioUtils.ts
// Este arquivo contém funções utilitárias puras para a decodificação de áudio,
// especificamente para o formato PCM bruto retornado pela API Gemini TTS.

/**
 * Decodifica uma string base64 para um Uint8Array (array de bytes).
 * @param base64 A string em formato base64.
 * @returns Um Uint8Array com os dados decodificados.
 */
export function decodeBase64(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Converte os dados de áudio brutos (PCM de 16-bit) em um `AudioBuffer` que a Web Audio API pode reproduzir.
 * A função `decodeAudioData` nativa do navegador não funciona para PCM bruto, então este processo manual é necessário.
 * @param pcmData O array de bytes contendo os dados de áudio PCM.
 * @param audioContext A instância do AudioContext do navegador.
 * @returns Uma promessa que resolve com o `AudioBuffer` pronto para ser tocado.
 */
export async function decodePcmData(
    pcmData: Uint8Array,
    audioContext: AudioContext,
): Promise<AudioBuffer> {
    // A API retorna PCM s16le (16-bit signed little-endian), então interpretamos o buffer como Int16Array.
    const pcmAsInt16 = new Int16Array(pcmData.buffer);
    const frameCount = pcmAsInt16.length;
    
    // A API do Gemini TTS usa uma taxa de amostragem de 24kHz e 1 canal (mono). Estes valores são fixos.
    const sampleRate = 24000;
    const numChannels = 1;

    // Cria um buffer de áudio vazio com as especificações corretas.
    const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Normaliza os valores de Int16 (-32768 a 32767) para o formato Float32 (-1.0 a 1.0) que a Web Audio API espera.
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = pcmAsInt16[i] / 32768.0;
    }

    return buffer;
}