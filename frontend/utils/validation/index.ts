import { z } from 'zod';

import { t } from '@/i18n';

/**
 * Frontend form validation built on Zod. Form inputs are captured as strings
 * (e.g. a price field holds "12.50"), so numeric fields coerce from string and
 * messages are pre-translated via the i18n catalog.
 */

const NAME_MAX = 80;
const NOTES_MAX = 500;

// ── Reusable field builders ──────────────────────────────────────────────────

/** Non-empty, trimmed text with a max length. */
export const nameField = z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .max(NAME_MAX, t('validation.maxLength', { max: NAME_MAX }));

/** Optional free text (notes / description). */
export const notesField = z
    .string()
    .trim()
    .max(NOTES_MAX, t('validation.maxLength', { max: NOTES_MAX }))
    .optional();

/** A required selection (non-empty id/value). */
export const selectField = z.string().trim().min(1, t('validation.selectOption'));

/** A coerced strictly-positive number from a string input. */
export const positiveNumber = z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .transform((s) => Number(s))
    .refine((n) => Number.isFinite(n), t('validation.number'))
    .refine((n) => n > 0, t('validation.positive'));

/** A coerced non-negative number from a string input. */
export const nonNegativeNumber = z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .transform((s) => Number(s))
    .refine((n) => Number.isFinite(n), t('validation.number'))
    .refine((n) => n >= 0, t('validation.nonNegative'));

/** A PIN: 4–8 digits. */
export const pinField = z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, t('validation.pinFormat'));

/** An optional phone number with a permissive format. */
export const phoneField = z
    .string()
    .trim()
    .regex(/^[+\d][\d\s().-]{2,30}$/, t('validation.phoneFormat'))
    .optional()
    .or(z.literal(''));

// ── Helper ───────────────────────────────────────────────────────────────────

export type ValidateResult<T> =
    | { ok: true; data: T }
    | { ok: false; errors: Record<string, string> };

/**
 * Validate a form object against a schema. On failure returns a map of
 * field-name → first translated error message, suitable for per-field display.
 */
export function validateForm<T>(schema: z.ZodType<T>, form: unknown): ValidateResult<T> {
    const result = schema.safeParse(form);
    if (result.success) {
        return { ok: true, data: result.data };
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) {
            fieldErrors[key] = issue.message;
        }
    }
    return { ok: false, errors: fieldErrors };
}

/**
 * Validate a single field against a full-object schema. Runs the schema and
 * returns the first translated message whose issue path starts with `field`, or
 * `null` if the field is currently valid. Useful for on-blur, per-field feedback
 * without surfacing errors for fields the user hasn't touched yet.
 */
export function validateField(
    schema: z.ZodType<unknown>,
    form: unknown,
    field: string,
): string | null {
    const result = schema.safeParse(form);
    if (result.success) {
        return null;
    }
    for (const issue of result.error.issues) {
        if (issue.path[0] === field) {
            return issue.message;
        }
    }
    return null;
}
