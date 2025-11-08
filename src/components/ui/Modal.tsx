// components/ui/Modal.tsx
// Um componente de modal genérico e reutilizável para exibir diálogos, confirmações ou formulários
// que sobrepõem o conteúdo principal da página.

import React, { Fragment } from 'react';
import Button from './Button';
import Icon from './Icon';

// Define a estrutura para configurar os botões de ação do modal.
interface ButtonConfig {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    className?: string;
    // FIX: Add isLoading and disabled properties to allow them to be passed to the Button component.
    isLoading?: boolean;
    disabled?: boolean;
}

interface ModalProps {
    /** Se verdadeiro, o modal é exibido. */
    isOpen: boolean;
    /** Função chamada quando o modal deve ser fechado (ex: clique no overlay ou no botão de fechar). */
    onClose: () => void;
    /** O título exibido no cabeçalho do modal. */
    title: string;
    /** O conteúdo principal a ser renderizado dentro do modal. */
    children: React.ReactNode;
    /** Uma lista de configurações de botão para as ações do modal. */
    buttons: ButtonConfig[];
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, buttons }) => {
    return (
        // `Fragment` é usado para agrupar o overlay e o painel do modal sem adicionar um nó extra ao DOM.
        <Fragment>
            {/* Overlay: Fundo semitransparente que cobre a página. Clicar nele fecha o modal. */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-70 z-50 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            ></div>
            
            {/* Painel do Modal: A caixa de diálogo principal. */}
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
                    isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
            >
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
                    <div className="flex items-start justify-between">
                         <h2 className="text-2xl font-display text-white">{title}</h2>
                         <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-zinc-800 hover:text-white transition-colors">
                            <Icon name="close" className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="my-6 text-slate-300">
                        {children}
                    </div>
                    {/* Renderiza os botões de ação com base na configuração passada via props. */}
                    <div className="flex justify-end gap-4">
                        {buttons.map((button, index) => (
                             <Button
                                key={index}
                                variant={button.variant || 'secondary'}
                                onClick={button.onClick}
                                className={button.className}
                                // FIX: Pass isLoading and disabled props to the Button component.
                                isLoading={button.isLoading}
                                disabled={button.disabled}
                            >
                                {button.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Modal;