import bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

bcryptjs.setRandomFallback((len: number) => Array.from(randomBytes(len)));

export function hashPin(pin: string): string {
  return bcryptjs.hashSync(pin, SALT_ROUNDS);
}

export function verifyPin(pin: string, hash: string): boolean {
  return bcryptjs.compareSync(pin, hash);
}
