import React from 'react';
import SettingsDrawer from '../settings/SettingsDrawer';
import DevLogDrawer from '@/features/dev-log/DevLogDrawer';
import { DevLogReplayHandler } from '@/components/layout/AppChromeContext';

type GlobalOverlaysProps = {
    isSettingsOpen: boolean;
    onCloseSettings: () => void;
    isDevLogOpen: boolean;
    onCloseDevLog: () => void;
    devLogReplayHandler: DevLogReplayHandler | null;
};

const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({
    isSettingsOpen,
    onCloseSettings,
    isDevLogOpen,
    onCloseDevLog,
    devLogReplayHandler,
}) => {
    return (
        <>
            <SettingsDrawer isOpen={isSettingsOpen} onClose={onCloseSettings} />
            <DevLogDrawer
                isOpen={isDevLogOpen}
                onClose={onCloseDevLog}
                onReplayAction={devLogReplayHandler || undefined}
            />
        </>
    );
};

export default GlobalOverlays;
