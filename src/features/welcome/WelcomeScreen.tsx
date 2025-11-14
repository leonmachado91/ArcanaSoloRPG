// features/welcome/WelcomeScreen.tsx
// Este componente é a primeira tela que um novo usuário vê. Ele solicita um nome de usuário,
// que é usado para personalizar a experiência e, no futuro, para associar jogos salvos.
// O sistema de "login" é simplificado: o nome é apenas salvo no localStorage.

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { formatErrorForDisplay } from '../../types/game';
import { useErrorStore } from '@/store/errorStore';

const WelcomeScreen: React.FC = () => {
    const [usernameInput, setUsernameInput] = useState('');
    const { signIn, isLoading } = useAuthStore();
    const { showError } = useErrorStore();

    /**
     * Manipulador para o envio do formulário de login.
     * @param e O evento do formulário.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUsername = usernameInput.trim();
        if (trimmedUsername && !isLoading) {
            try {
                // [Remoção] A chamada a `usernameExists` foi removida. O fluxo agora prossegue diretamente.
                await signIn(trimmedUsername);
            } catch (error) {
                const message = formatErrorForDisplay(error, "Um erro inesperado ocorreu ao tentar entrar.");
                showError(message);
            }
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full bg-amber-500/10 blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-1/3 h-1/3 rounded-full bg-amber-600/20 blur-3xl animate-pulse delay-500"></div>

            <main className="z-10 text-center flex flex-col items-center gap-8 w-full max-w-md">
                <h1 className="text-5xl md:text-7xl font-display font-bold text-[#f5f0e1] tracking-wider"
                    style={{ textShadow: '0 0 25px rgba(212, 175, 55, 0.5)' }}>
                    Bem-vindo a ARCANA
                </h1>
                <p className="max-w-xl text-lg text-slate-300 font-body-serif">
                    Para salvar seu progresso, escolha um nome de aventureiro ou use um existente.
                </p>
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 items-center">
                    <Input
                        label="Nome de Aventureiro"
                        placeholder="Insira seu nome aqui"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="text-center"
                        disabled={isLoading}
                    />
                    <Button type="submit" isLoading={isLoading} disabled={!usernameInput.trim()}>
                        Entrar no Mundo
                    </Button>
                </form>
            </main>
        </div>
    );
};

export default WelcomeScreen;
