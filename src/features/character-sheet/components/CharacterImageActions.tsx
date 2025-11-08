// features/character-sheet/components/CharacterImageActions.tsx
import React, { useRef } from 'react';
import { Character } from '@/types/character';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

interface CharacterImageActionsProps {
    character: Character;
    onGenerateImage?: (character: Character) => void;
    onUploadImage?: (character: Character, file: File) => void;
    isGeneratingImage?: boolean;
    buttonSizeClass: string;
    iconSizeClass: string;
}

const CharacterImageActions: React.FC<CharacterImageActionsProps> = ({ character, onGenerateImage, onUploadImage, isGeneratingImage, buttonSizeClass, iconSizeClass }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onUploadImage) {
            onUploadImage(character, file);
        }
        if(event.target) event.target.value = ''; // Reseta o input para permitir o upload do mesmo arquivo novamente.
    };

    if (isGeneratingImage) {
        return (
            <div className={`${buttonSizeClass} bg-zinc-600 rounded-full flex items-center justify-center`}>
                <Spinner className={iconSizeClass} />
            </div>
        );
    }
    
    const buttonColorClasses = 'bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-500';

    return (
        <div className="relative flex items-center group">
             {/* Botão de Upload (aparece no hover do grupo). */}
            <div className="absolute right-full mr-2 transition-all duration-300 transform-gpu origin-right scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100">
                <button
                    onClick={handleUploadClick}
                    className={`${buttonSizeClass} ${buttonColorClasses}`}
                    aria-label="Anexar Imagem do PC"
                    title="Anexar Imagem do PC"
                >
                    <Icon name="upload" className={iconSizeClass} />
                </button>
            </div>

             {/* Botão Principal de Gerar com IA (sempre visível). */}
            <button
                onClick={() => onGenerateImage && onGenerateImage(character)}
                className={`${buttonSizeClass} ${buttonColorClasses} transform transition-transform group-hover:scale-110`}
                aria-label="Gerar Imagem com IA"
                title="Gerar Imagem com IA"
            >
                <Icon name="generate-ai" className={iconSizeClass} />
            </button>
            
            {/* Input de arquivo oculto que é acionado programaticamente. */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                hidden
            />
        </div>
    );
};

export default CharacterImageActions;
