// components/ui/Drawer.tsx
// Um componente de painel lateral (drawer) que desliza da direita da tela.
// É usado para exibir conteúdo secundário, como fichas de personagem detalhadas ou menus de opções,
// sem tirar o usuário do contexto principal.

import React, { Fragment } from 'react';
import Icon from './Icon';

interface DrawerProps {
    /** Se verdadeiro, o drawer é exibido. */
    isOpen: boolean;
    /** Função chamada quando o drawer deve ser fechado. */
    onClose: () => void;
    /** O conteúdo a ser renderizado dentro do drawer. */
    children: React.ReactNode;
    /** O título exibido no cabeçalho do drawer. */
    title: string;
    /** Define a largura do drawer. */
    size?: 'default' | 'large' | 'xlarge';
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children, title, size = 'default' }) => {
    // Classes condicionais para controlar a animação de entrada/saída.
    const transformClass = isOpen ? 'translate-x-0' : 'translate-x-full';
    
    let sizeClass = 'max-w-md';
    if (size === 'large') {
        sizeClass = 'max-w-3xl';
    } else if (size === 'xlarge') {
        sizeClass = 'max-w-6xl';
    }


    return (
        <Fragment>
            {/* Overlay: Fundo semitransparente que cobre a página. Clicar nele fecha o drawer. */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden="true"
            ></div>
            
            {/* Painel do Drawer: O container que desliza. */}
            <div
                className={`fixed top-0 right-0 h-full w-full ${sizeClass} bg-zinc-900/90 backdrop-blur-sm shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${transformClass}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-title"
            >
                <div className="flex flex-col h-full">
                    <header className="flex items-center justify-between p-4 border-b border-zinc-800">
                        <h2 id="drawer-title" className="text-xl font-display text-white">{title}</h2>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-zinc-800 hover:text-white transition-colors" aria-label="Fechar">
                           <Icon name="close" className="w-6 h-6" />
                        </button>
                    </header>
                    {/* O conteúdo principal do drawer é renderizado aqui e pode ter sua própria barra de rolagem. */}
                    <div className="flex-grow p-6 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Drawer;