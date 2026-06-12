import { useEffect, useRef, useState } from 'react';

type UseFormPanelOptions<T> = {
    visible: boolean;
    createDefaultForm: () => T;
    onOpen?: () => void | Promise<void>;
};

export function useFormPanel<T>({ visible, createDefaultForm, onOpen }: UseFormPanelOptions<T>) {
    const [form, setForm] = useState<T>(() => createDefaultForm());
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const prevVisibleRef = useRef(false);

    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;

        if (visible && !wasVisible) {
            setForm(createDefaultForm());
            setFieldErrors({});
            void onOpen?.();
        }
    }, [createDefaultForm, onOpen, visible]);

    return {
        form,
        setForm,
        fieldErrors,
        setFieldErrors,
    };
}
