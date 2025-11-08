// utils/fileUtils.ts

/**
 * Converte um objeto File (de um input de upload) em uma string base64 (Data URL).
 * Isso permite que a imagem seja exibida na UI e salva no estado sem precisar de um servidor.
 * @param file O arquivo a ser convertido.
 * @returns Uma promessa que resolve com a string da Data URL.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};