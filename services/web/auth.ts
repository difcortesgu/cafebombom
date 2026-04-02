import type { AuthService } from '@/services/interfaces/auth';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';
import { verifyPin } from '@/utils/hash';

import { nextId, readWebData, updateWebData } from './storage';

export class AuthWebService implements AuthService {
  async getActiveUsers(): Promise<User[]> {
    return readWebData()
      .users
      .filter((user) => user.isActive)
      .sort((left, right) => left.id - right.id)
      .map(({ id, name, role }) => ({ id, name, role }));
  }

  async authenticate({ userId, pin }: LoginPayload): Promise<User | null> {
    const user = readWebData().users.find((entry) => entry.id === userId && entry.isActive);

    if (!user || !verifyPin(pin, user.pinHash)) {
      return null;
    }

    return { id: user.id, name: user.name, role: user.role };
  }

  async startSession(userId: number): Promise<void> {
    updateWebData((data) => {
      data.sessions.push({
        id: nextId(data, 'sessions'),
        userId,
        loggedInAt: Math.floor(Date.now() / 1000),
        loggedOutAt: null,
      });
    });
  }

  async endOpenSession(userId: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    updateWebData((data) => {
      for (const session of data.sessions) {
        if (session.userId === userId && session.loggedOutAt === null) {
          session.loggedOutAt = now;
        }
      }
    });
  }
}