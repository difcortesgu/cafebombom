import type { Request, Response } from 'express';
import { usersService } from '../services';

// Known business-rule violations are thrown by the service as AppError and
// turned into 4xx responses by the central error handler (see utils/errors.ts).
// Unexpected errors propagate there too and become a logged 500.

export async function getActiveUsers(req: Request, res: Response): Promise<void> {
  const users = await usersService.getActiveUsers();
  res.status(200).json(users);
}

export async function getAllUsers(req: Request, res: Response): Promise<void> {
  const users = await usersService.getAllUsers();
  res.status(200).json(users);
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

  const user = await usersService.createUser({ name, role, pin });
  if (!user) {
    res.status(409).json({ error: 'User already exists or PIN is too short.' });
    return;
  }
  res.status(201).json(user);
}

export async function deactivateUser(req: Request, res: Response): Promise<void> {
  const actorUserId = req.auth!.userId;
  const { id } = req.params as Record<string, string>;

  await usersService.deactivateUser(actorUserId, id);
  res.status(204).send();
}

export async function reactivateUser(req: Request, res: Response): Promise<void> {
  const actorUserId = req.auth!.userId;
  const { id } = req.params as Record<string, string>;

  await usersService.reactivateUser(actorUserId, id);
  res.status(204).send();
}

export async function hardDeleteUser(req: Request, res: Response): Promise<void> {
  const actorUserId = req.auth!.userId;
  const { id } = req.params as Record<string, string>;

  await usersService.hardDeleteUser(actorUserId, id);
  res.status(204).send();
}

export async function updateOwnProfile(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const { name, pin } = req.body as { name?: string; pin?: string };

  const user = await usersService.updateOwnProfile(userId, { name, pin });
  if (!user) {
    res.status(404).json({ error: 'User not found or inactive.' });
    return;
  }
  res.status(200).json(user);
}
