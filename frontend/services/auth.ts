import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload, UpdateOwnProfilePayload } from '@/types/auth';
import type { User } from '@/types/types';
import { apiClient } from './api-client';

type LoginResponse = {
  token: string;
  tokenType: string;
  expiresIn: string;
  user: User;
  sessionId: string;
};

export class AuthService {
  async getActiveUsers(): Promise<User[]> {
    const response = await apiClient.get<{ users: User[] }>('/users/active');
    return response.users || [];
  }

  async getAllUsers(): Promise<ManagedUser[]> {
    const response = await apiClient.get<{ users: ManagedUser[] }>('/users');
    return response.users || [];
  }

  async authenticate(payload: LoginPayload): Promise<User | null> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', payload);
      
      // Store token for future requests
      apiClient.setToken(response.token);
      
      return response.user;
    } catch (error) {
      return null;
    }
  }

  async createUser(payload: CreateUserPayload): Promise<User | null> {
    try {
      const response = await apiClient.post<{ user: User }>('/users', payload);
      return response.user || null;
    } catch (error) {
      return null;
    }
  }

  async deactivateUser(actorUserId: string, targetUserId: string): Promise<void> {
    await apiClient.post(`/users/${targetUserId}/deactivate`, {});
  }

  async reactivateUser(actorUserId: string, targetUserId: string): Promise<void> {
    await apiClient.post(`/users/${targetUserId}/reactivate`, {});
  }

  async hardDeleteUser(actorUserId: string, targetUserId: string): Promise<void> {
    await apiClient.delete(`/users/${targetUserId}`);
  }

  async updateOwnProfile(userId: string, payload: UpdateOwnProfilePayload): Promise<User | null> {
    try {
      const response = await apiClient.patch<{ user: User }>('/users/profile', payload);
      return response.user || null;
    } catch (error) {
      return null;
    }
  }

  async setupDeleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  async setupReactivateUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/reactivate`, {});
  }

  async setupHardDeleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  async setupUpdateUser(userId: string, payload: SetupUpdateUserPayload): Promise<User | null> {
    try {
      const response = await apiClient.patch<{ user: User }>(`/users/${userId}`, payload);
      return response.user || null;
    } catch (error) {
      return null;
    }
  }

  async startSession(userId: string): Promise<string> {
    const response = await apiClient.post<{ sessionId: string }>('/auth/login', {});
    return response.sessionId || '';
  }

  async endOpenSession(userId: string): Promise<void> {
    await apiClient.post('/auth/logout', {});
    // Clear token on logout
    apiClient.setToken(null);
  }
}
