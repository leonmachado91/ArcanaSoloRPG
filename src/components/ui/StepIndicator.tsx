// components/ui/StepIndicator.tsx
import React from 'react';

/**
 * Componente `StepIndicator`
 * Um componente visual simples para mostrar ao usuário em qual passo de um formulário ele está.
 * @param currentStep O passo atual.
 * @param totalSteps O número total de passos.
 */
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
    <div className="flex justify-center items-center space-x-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, index) => (
            <div
                key={index}
                className={`w-12 h-2 rounded-full transition-all duration-300 ${
                    index + 1 <= currentStep ? 'bg-amber-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-zinc-700'
                }`}
            />
        ))}
    </div>
);

export default StepIndicator;