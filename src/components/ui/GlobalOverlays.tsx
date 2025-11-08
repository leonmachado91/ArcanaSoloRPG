import React, { useState } from 'react';
import Button from './Button';
import Icon from './Icon';
import SettingsDrawer from '../settings/SettingsDrawer';
import DevLogDrawer from '@/features/dev-log/DevLogDrawer';
import { useNavigationStore } from '@/store/navigationStore';

const GlobalOverlays: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDevLogOpen, setIsDevLogOpen] = useState(false);
    const history = useNavigationStore(state => state.history);
    const screen = history[history.length - 1];

    // Não mostra os botões em telas que já possuem cabeçalhos complexos ou são modais
    if (screen === 'game-room' || screen === 'campaign-loading') {
        return null;
    }

    return (
        <>
            <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
                <Button variant="ghost" className="p-2" onClick={() => setIsDevLogOpen(true)} aria-label="Log do Desenvolvedor">
                    <Icon name="code" className="w-7 h-7" />
                </Button>
                <Button variant="ghost" className="p-2" onClick={() => setIsSettingsOpen(true)} aria-label="Opções">
                    <Icon name="settings" className="w-7 h-7" />
                </Button>
            </div>

            <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <DevLogDrawer isOpen={isDevLogOpen} onClose={() => setIsDevLogOpen(false)} />
        </>
    );
};

export default GlobalOverlays;
