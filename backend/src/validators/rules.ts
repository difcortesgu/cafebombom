import { z } from 'zod';

/**
 * Shared validation limits and reusable Zod field builders.
 * Centralizes the magic numbers and formats so every schema stays consistent.
 */

export const NAME_MIN = 1;
export const NAME_MAX = 80;
export const NOTES_MAX = 500;
/** Upper bound for any monetary amount or rate. Guards against overflow / typos. */
export const MONEY_MAX = 1_000_000_000;
/** Upper bound for any quantity (stock, recipe, order items). */
export const QTY_MAX = 1_000_000;

export const PIN_REGEX = /^\d{4,8}$/;
/** Permissive phone format: digits, spaces, and + ( ) - separators. */
export const PHONE_REGEX = /^[+\d][\d\s().-]{2,30}$/;

/** Non-empty, trimmed display name with a sane max length. */
export const nameField = z
    .string({ message: 'name is required.' })
    .trim()
    .min(NAME_MIN, 'name is required.')
    .max(NAME_MAX, `name must be at most ${NAME_MAX} characters.`);

/** Optional free-text notes/description. */
export const notesField = z
    .string()
    .trim()
    .max(NOTES_MAX, `text must be at most ${NOTES_MAX} characters.`)
    .optional();

/** A non-negative monetary amount (price, cost, surcharge). */
export const money = (label = 'amount') =>
    z
        .number({ message: `${label} must be a number.` })
        .nonnegative(`${label} must be zero or greater.`)
        .max(MONEY_MAX, `${label} is too large.`);

/** A strictly positive monetary amount (rate, expense amount). */
export const positiveMoney = (label = 'amount') =>
    z
        .number({ message: `${label} must be a number.` })
        .positive(`${label} must be greater than zero.`)
        .max(MONEY_MAX, `${label} is too large.`);

/** A strictly positive quantity. */
export const positiveQuantity = (label = 'quantity') =>
    z
        .number({ message: `${label} must be a number.` })
        .positive(`${label} must be greater than zero.`)
        .max(QTY_MAX, `${label} is too large.`);

/** A non-negative quantity (e.g. low-stock threshold). */
export const nonNegativeQuantity = (label = 'quantity') =>
    z
        .number({ message: `${label} must be a number.` })
        .nonnegative(`${label} must be zero or greater.`)
        .max(QTY_MAX, `${label} is too large.`);

/** A non-empty identifier string. */
export const id = (label = 'id') =>
    z.string({ message: `${label} is required.` }).trim().min(1, `${label} is required.`);

/** A unix timestamp (seconds or ms — caller decides semantics). */
export const timestamp = z.number({ message: 'timestamp must be a number.' }).int().nonnegative();

/** A coerced unix timestamp, for query-string params that arrive as strings. */
export const coercedTimestamp = z.coerce.number().int().nonnegative();
