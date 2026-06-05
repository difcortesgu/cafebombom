/**
 * Lightweight app-wide logger for the CafeBomBom frontend.
 *
 * Why this exists: on a customer's device there is no console to inspect when
 * something fails. This logger keeps a rolling in-memory buffer of recent
 * entries, mirrors them to `console.*` (so web/dev tools still work), and
 * persists the buffer to storage so logs survive an app restart. The buffer can
 * be exported to a shareable `.txt` file so a user can send their logs for
 * support (see `exportLogsToFile`).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: unknown;
};

const STORAGE_KEY = 'diagnostics.logs';
const MAX_ENTRIES = 500;
const PERSIST_THROTTLE_MS = 2000;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function configuredLevel(): LogLevel {
  const raw = (process.env.EXPO_PUBLIC_LOG_LEVEL || 'info').toLowerCase();
  return (['debug', 'info', 'warn', 'error'] as const).includes(raw as LogLevel)
    ? (raw as LogLevel)
    : 'info';
}

function isWeb(): boolean {
  return typeof window !== 'undefined' && Platform.OS === 'web';
}

function serializeContext(context: unknown): string {
  if (context === undefined) {
    return '';
  }
  if (context instanceof Error) {
    return ` ${context.stack || context.message}`;
  }
  try {
    return ` ${typeof context === 'string' ? context : JSON.stringify(context)}`;
  } catch {
    return ` ${String(context)}`;
  }
}

function formatEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${serializeContext(entry.context)}`;
}

class Logger {
  private buffer: LogEntry[] = [];
  private readonly minLevel = LEVEL_ORDER[configuredLevel()];
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated = false;

  constructor() {
    // Restore any persisted logs from a previous session (best-effort).
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    try {
      const raw = isWeb()
        ? window.localStorage.getItem(STORAGE_KEY)
        : await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as LogEntry[];
        if (Array.isArray(restored)) {
          // Keep restored entries oldest-first, capped to MAX_ENTRIES.
          this.buffer = [...restored, ...this.buffer].slice(-MAX_ENTRIES);
        }
      }
    } catch {
      // Ignore hydration failures; logging must never crash the app.
    } finally {
      this.hydrated = true;
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persist();
    }, PERSIST_THROTTLE_MS);
  }

  private async persist(): Promise<void> {
    try {
      const payload = JSON.stringify(this.buffer);
      if (isWeb()) {
        window.localStorage.setItem(STORAGE_KEY, payload);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, payload);
      }
    } catch {
      // Ignore persistence failures to keep the app functional.
    }
  }

  private record(level: LogLevel, message: string, context?: unknown): void {
    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message, context };

    // Always mirror to the console so dev tools / web still surface output.
    const consoleFn =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(formatEntry(entry));

    if (LEVEL_ORDER[level] < this.minLevel) {
      return;
    }

    this.buffer.push(entry);
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer.splice(0, this.buffer.length - MAX_ENTRIES);
    }
    this.schedulePersist();
  }

  debug(message: string, context?: unknown): void {
    this.record('debug', message, context);
  }

  info(message: string, context?: unknown): void {
    this.record('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.record('warn', message, context);
  }

  error(message: string, context?: unknown): void {
    this.record('error', message, context);
  }

  /** Returns the buffered logs rendered as plain text, oldest first. */
  getLogs(): string {
    return this.buffer.map(formatEntry).join('\n');
  }

  /** Clears the in-memory buffer and persisted copy. */
  async clear(): Promise<void> {
    this.buffer = [];
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    try {
      if (isWeb()) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore.
    }
  }

  /**
   * Writes the buffered logs to a `.txt` file and offers it for sharing so a
   * user can send their logs for support.
   *
   * - Web: triggers a browser download of the file.
   * - Android: writes to cache and opens the system share sheet (ACTION_SEND).
   * - Other native: writes to the document directory and returns the path.
   *
   * Returns the file location (path or object URL) when available.
   */
  async exportLogsToFile(): Promise<string | null> {
    const text = this.getLogs() || 'No hay registros disponibles.';
    const fileName = `cafebombom-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;

    if (isWeb()) {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      return fileName;
    }

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const fileUri = `${baseDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, text);

    if (Platform.OS === 'android') {
      // Convert to a content:// URI exposed through the app's FileProvider so
      // other apps (email, messaging) can read the attachment.
      const FLAG_GRANT_READ_URI_PERMISSION = 1;
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: 'text/plain',
        extra: { 'android.intent.extra.STREAM': contentUri },
      });
    }

    return fileUri;
  }
}

export const logger = new Logger();
