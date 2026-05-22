import { useState } from 'react';

type PanelLifecycle = {
    visible: boolean;
    mounted: boolean;
    open: () => void;
    close: () => void;
    onExited: () => void;
};

export function usePanelLifecycle(): PanelLifecycle {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    function open() {
        setMounted(true);
        setVisible(true);
    }

    function close() {
        setVisible(false);
    }

    function onExited() {
        setMounted(false);
    }

    return { visible, mounted, open, close, onExited };
}
