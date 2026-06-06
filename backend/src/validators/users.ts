import { z } from 'zod';
import { nameField, PIN_REGEX } from './rules';

const roleField = z.enum(['owner', 'staff'], { message: 'role must be owner or staff.' });
const pinField = z
    .string({ message: 'pin is required.' })
    .regex(PIN_REGEX, 'pin must be 4 to 8 digits.');

export const createUserSchema = z.object({
    name: nameField,
    role: roleField,
    pin: pinField,
});
export type CreateUserPayload = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z.object({
    name: nameField.optional(),
    pin: pinField.optional(),
});
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
