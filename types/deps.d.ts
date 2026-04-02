declare module 'expo-sqlite' {
  export type SQLiteRunResult = {
    lastInsertRowId: number;
    changes: number;
  };

  export type SQLiteDatabase = {
    execAsync(sql: string): Promise<void>;
    runAsync(sql: string, params?: unknown[]): Promise<SQLiteRunResult>;
    getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
    getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  };

  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}

declare module 'zustand' {
  export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  export type GetState<T> = () => T;

  export type UseBoundStore<T> = {
    (): T;
    <U>(selector: (state: T) => U): U;
  };

  export function create<T>(initializer: (set: SetState<T>, get: GetState<T>) => T): UseBoundStore<T>;
}

declare module 'react-native-gifted-charts' {
  import { ComponentType } from 'react';

  export const BarChart: ComponentType<Record<string, unknown>>;
}
