// features/game-room/components/SaveStatusIndicator.tsx
import React, { useState, useEffect } from 'react';
import Icon from '../../../components/ui/Icon';
import Spinner from '../../../components/ui/Spinner';

/**
 * Componente `SaveStatusIndicator`
 * Um indicador visual que mostra o estado do salvamento automático na nuvem
 * (Salvando..., Salvo na nuvem), fornecendo feedback crucial ao usuário.
 * @param isSaving Booleano que indica se o processo de salvamento está ativo.
 */
const SaveStatusIndicator: React.FC<{ isSaving?: boolean }> = ({ isSaving }) => {
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        if (isSaving) {
            setStatus('saving');
        } else if (status === 'saving') {
            // Quando `isSaving` se torna falso após ter sido verdadeiro,
            // mostra "Salvo" por um tempo e depois desaparece.
            setStatus('saved');
            const timer = setTimeout(() => setStatus('idle'), 2000); // Duração do feedback visual
            return () => clearTimeout(timer);
        }
    }, [isSaving, status]);

    if (status === 'idle') return null;

    return (
        <div className="flex items-center gap-2 text-sm text-slate-400 transition-opacity duration-500">
            {status === 'saving' && (
                <>
                    <Spinner className="w-4 h-4" />
                    <span>Salvando...</span>
                </>
            )}
            {status === 'saved' && (
                <>
                    <Icon name="check" className="w-4 h-4 text-green-400" />
                    <span>Salvo na nuvem</span>
                </>
            )}
        </div>
    );
};

export default SaveStatusIndicator;