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
    const response = await apiClient.get<User[]>('/users/active');
    return response || [];
  }

  async getAllUsers(): Promise<ManagedUser[]> {
    try {
      const response = await apiClient.get<ManagedUser[]>('/users');
      return response || [];
    } catch {
      try {
        return await this.getSetupUsers();
      } catch {
        return [];
      }
    }
  }

  async getSetupUsers(): Promise<ManagedUser[]> {
    const response = await apiClient.get<ManagedUser[]>('/setup/users');
    return response || [];
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
      const response = await apiClient.post<User>('/users', payload);
      return response || null;
    } catch (error) {
      return null;
    }
  }

  async setupCreateUser(payload: CreateUserPayload): Promise<User | null> {
    try {
      const response = await apiClient.post<User>('/setup/users', payload);
      return response || null;
    } catch {
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
    await apiClient.delete(`/setup/users/${userId}`);
  }

  async setupReactivateUser(userId: string): Promise<void> {
    await apiClient.post(`/setup/users/${userId}/reactivate`, {});
  }

  async setupHardDeleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/setup/users/${userId}/hard`);
  }

  async setupUpdateUser(userId: string, payload: SetupUpdateUserPayload): Promise<User | null> {
    try {
      const response = await apiClient.patch<User>(`/setup/users/${userId}`, payload);
      return response || null;
    } catch (error) {
      return null;
    }
  }

  async startSession(_userId: string): Promise<string> {
    return '';
  }

  async endOpenSession(_userId: string): Promise<void> {
    await apiClient.post('/auth/logout', {});
    // Clear token on logout
    apiClient.setToken(null);
  }
}
