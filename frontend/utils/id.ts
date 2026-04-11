import { v4 as uuidv4 } from 'uuid';

let randomValuesReady = false;

function ensureRandomValues() {
  if (randomValuesReady) {
    return;
  }
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    randomValuesReady = true;
    return;
  }
  try {
    // Loaded lazily so node-based tools (like drizzle-kit) can evaluate schema files.
    require('react-native-get-random-values');
  } catch {
    // In non-react-native runtimes, uuid usually has native crypto support already.
  }
  randomValuesReady = true;
}

export function generateId(): string {
  ensureRandomValues();
  return uuidv4();
}
