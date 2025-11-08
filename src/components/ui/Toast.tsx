// components/ui/Toast.tsx
// Componente individual de notificação de erro (toast).
// Ele é responsável por sua própria animação de entrada/saída e pelo tempo de exibição.

import React, { useState, useEffect } from 'react';
import { getConfig } from '../../services/configService';

interface ToastProps {
    /** A mensagem de erro a ser exibida. */
    message: string;
    /** Função chamada para remover o toast do estado global quando ele terminar sua animação de saída. */
    onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
    // Estado para controlar a animação de saída.
    const [isExiting, setIsExiting] = useState(false);
    // Obtém a duração do toast a partir da configuração global.
    const duration = getConfig().ui.toastDurationMs;

    // Efeito para autodispensar o toast após a duração definida.
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            // Espera a animação de saída (300ms) terminar antes de chamar `onDismiss`.
            setTimeout(onDismiss, 300); 
        }, duration);

        // Limpa o timer se o componente for desmontado antes do tempo.
        return () => clearTimeout(timer);
    }, [duration, onDismiss]);

    /**
     * Inicia o processo de dispensa manual quando o usuário clica no botão de fechar.
     */
    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    return (
        <div
            className={`
                w-full max-w-sm p-4 rounded-lg shadow-lg flex items-start justify-between
                bg-red-800 border border-red-700 text-white
                transition-all duration-300 transform
                ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
            `}
            role="alert"
        >
            <p className="flex-grow pr-4">{message}</p>
            <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 -m-1 rounded-full hover:bg-red-700 transition-colors"
                aria-label="Dispensar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default Toast;
