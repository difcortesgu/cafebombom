import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';

export interface AuthService {
  getActiveUsers(): Promise<User[]>;
  authenticate(payload: LoginPayload): Promise<User | null>;
  startSession(userId: number): Promise<void>;
  endOpenSession(userId: number): Promise<void>;
}
