// store/errorStore.ts
import { create } from 'zustand';

interface ToastMessage {
    id: number;
    message: string;
}

interface ErrorState {
    toasts: ToastMessage[];
}

interface ErrorActions {
    showError: (message: string) => void;
    removeToast: (id: number) => void;
}

let nextId = 0;

export const useErrorStore = create<ErrorState & ErrorActions>((set) => ({
    toasts: [],
    showError: (message) => {
        const newToast: ToastMessage = { id: nextId++, message };
        set(state => ({ toasts: [...state.toasts, newToast] }));
    },
    removeToast: (id) => {
        set(state => ({ toasts: state.toasts.filter(toast => toast.id !== id) }));
    },
}));
