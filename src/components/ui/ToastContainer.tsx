// components/ui/ToastContainer.tsx
// Este componente atua como um container para todas as notificações de erro (toasts).
// Ele obtém a lista de toasts ativos do `ErrorContext` e os renderiza em uma posição
// fixa na tela (canto inferior direito).

import React from 'react';
import { useErrorStore } from '@/store/errorStore';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useErrorStore();

    return (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm space-y-3">
            {/* Mapeia a lista de toasts do contexto para componentes Toast individuais. */}
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    // Passa a função `removeToast` para que cada Toast possa se remover
                    // do estado global quando for dispensado.
                    onDismiss={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
