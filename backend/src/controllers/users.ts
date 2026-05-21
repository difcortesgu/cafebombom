import { usersService } from '@/services';
import type { Request, Response } from 'express';

export async function getActiveUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await usersService.getActiveUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('[users] getActiveUsers failed:', error);
    res.status(500).json({ error: 'Failed to fetch active users.' });
  }
}

export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('[users] getAllUsers failed:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, role, pin } = req.body as { name?: string; role?: string; pin?: string };

  if (!name || !role || !pin) {
    res.status(400).json({ error: 'name, role, and pin are required.' });
    return;
  }

  if (role !== 'owner' && role !== 'staff') {
    res.status(400).json({ error: 'role must be owner or staff.' });
    return;
  }

  try {
    const user = await usersService.createUser({ name, role, pin });
    if (!user) {
      res.status(409).json({ error: 'User already exists or PIN is too short.' });
      return;
    }
    res.status(201).json(user);
  } catch (error) {
    console.error('[users] createUser failed:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
}

export async function deactivateUser(req: Request, res: Response): Promise<void> {
  const actorUserId = req.auth!.userId;
  const { id } = req.params as Record<string, string>;

  try {
    await usersService.deactivateUser(actorUserId, id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('own account') || msg.includes('last owner') || msg.includes('not active')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[users] deactivateUser failed:', error);
    res.status(500).json({ error: 'Failed to deactivate user.' });
  }
}

export async function reactivateUser(req: Request, res: Response): Promise<void> {
  const actorUserId = req.auth!.userId;
  const { id } = req.params as Record<string, string>;

  try {
    await usersService.reactivateUser(actorUserId, id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('own account') || msg.includes('already active') || msg.includes('missing')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[users] reactivateUser failed:', error);
    res.status(500).json({ error: 'Failed to reactivate user.' });
  }
}

export async function hardDeleteUser(req: Request, res: Response): Promise<void> {
  const actorUserId = req.auth!.userId;
  const { id } = req.params as Record<string, string>;

  try {
    await usersService.hardDeleteUser(actorUserId, id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (
      msg.includes('own account') ||
      msg.includes('last owner') ||
      msg.includes('linked sales') ||
      msg.includes('does not exist')
    ) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[users] hardDeleteUser failed:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}

export async function updateOwnProfile(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const { name, pin } = req.body as { name?: string; pin?: string };

  try {
    const user = await usersService.updateOwnProfile(userId, { name, pin });
    if (!user) {
      res.status(404).json({ error: 'User not found or inactive.' });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('empty') || msg.includes('PIN') || msg.includes('already uses')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[users] updateOwnProfile failed:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}
