import bcryptjs from 'bcryptjs';
import * as Crypto from 'expo-crypto';

const SALT_ROUNDS = 10;

// Expo native does not always expose WebCrypto/Node crypto. bcryptjs requires
// a random byte generator for salt creation, so we provide one via expo-crypto.
bcryptjs.setRandomFallback((len: number) => Array.from(Crypto.getRandomBytes(len)));

export function hashPin(pin: string): string {
  return bcryptjs.hashSync(pin, SALT_ROUNDS);
}

export function verifyPin(pin: string, hash: string): boolean {
  return bcryptjs.compareSync(pin, hash);
}