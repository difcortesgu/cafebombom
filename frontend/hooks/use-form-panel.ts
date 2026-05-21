import { useEffect, useRef, useState } from 'react';

type UseFormPanelOptions<T> = {
    visible: boolean;
    createDefaultForm: () => T;
    onOpen?: () => void | Promise<void>;
};

export function useFormPanel<T>({ visible, createDefaultForm, onOpen }: UseFormPanelOptions<T>) {
    const [form, setForm] = useState<T>(() => createDefaultForm());
    const [message, setMessage] = useState('');
    const prevVisibleRef = useRef(false);

    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;

        if (visible && !wasVisible) {
            setForm(createDefaultForm());
            setMessage('');
            void onOpen?.();
        }
    }, [createDefaultForm, onOpen, visible]);

    return {
        form,
        setForm,
        message,
        setMessage,
    };
}
