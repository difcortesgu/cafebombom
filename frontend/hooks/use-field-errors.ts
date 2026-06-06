import { useState } from 'react';
import type { z } from 'zod';

import { validateField } from '@/utils/validation';

/**
 * Per-field validation state for forms. Wire `validate(field, form)` to each
 * input's `onBlur` so leaving a field immediately shows (or clears) its error,
 * while `submit()` keeps using the full-form `validateForm` as the final gate.
 */
export function useFieldErrors(schema: z.ZodType<unknown>) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (field: string, form: unknown) => {
        const message = validateField(schema, form, field);
        setErrors((prev) => {
            if (message) {
                return { ...prev, [field]: message };
            }
            if (!(field in prev)) return prev;
            const { [field]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const clearError = (field: string) => {
        setErrors((prev) => {
            if (!(field in prev)) return prev;
            const { [field]: _removed, ...rest } = prev;
            return rest;
        });
    };

    return { errors, setErrors, validate, clearError };
}
