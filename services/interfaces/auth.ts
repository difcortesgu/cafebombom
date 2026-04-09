import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload, UpdateOwnProfilePayload } from '@/types/auth';
import type { User } from '@/types/types';

export interface AuthService {
  getActiveUsers(): Promise<User[]>;
  getAllUsers(): Promise<ManagedUser[]>;
  authenticate(payload: LoginPayload): Promise<User | null>;
  createUser(payload: CreateUserPayload): Promise<User | null>;
  deactivateUser(actorUserId: string, targetUserId: string): Promise<void>;
  reactivateUser(actorUserId: string, targetUserId: string): Promise<void>;
  hardDeleteUser(actorUserId: string, targetUserId: string): Promise<void>;
  updateOwnProfile(userId: string, payload: UpdateOwnProfilePayload): Promise<User | null>;
  setupDeleteUser(userId: string): Promise<void>;
  setupReactivateUser(userId: string): Promise<void>;
  setupHardDeleteUser(userId: string): Promise<void>;
  setupUpdateUser(userId: string, payload: SetupUpdateUserPayload): Promise<User | null>;
  startSession(userId: string): Promise<string>;
  endOpenSession(userId: string): Promise<void>;
}
