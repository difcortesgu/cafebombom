import type { Request, Response } from 'express';
import { paymentMethodsService } from '../services';

// Unique-constraint conflicts are thrown by the service as a 409 AppError and
// handled by the central error handler (see utils/errors.ts). Unexpected errors
// propagate there too and become a logged 500.

export async function getAllPaymentMethods(req: Request, res: Response): Promise<void> {
    const methods = await paymentMethodsService.getAll();
    res.status(200).json(methods);
}

export async function getActivePaymentMethods(req: Request, res: Response): Promise<void> {
    const methods = await paymentMethodsService.getActive();
    res.status(200).json(methods);
}

export async function getPaymentMethodById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'id is required.' });
        return;
    }

    const method = await paymentMethodsService.getById(id);
    if (!method) {
        res.status(404).json({ error: 'Payment method not found.' });
        return;
    }
    res.status(200).json(method);
}

export async function createPaymentMethod(req: Request, res: Response): Promise<void> {
    const { name, icon } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name is required.' });
        return;
    }

    const iconValue = icon && typeof icon === 'string' ? icon.trim() : 'wallet';

    const id = await paymentMethodsService.create(name.trim(), iconValue);
    res.status(201).json({ id, name: name.trim(), icon: iconValue, is_active: true });
}

export async function updatePaymentMethod(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, isActive, icon } = req.body;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'id is required.' });
        return;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name is required.' });
        return;
    }

    if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive must be a boolean.' });
        return;
    }

    const updated = await paymentMethodsService.update(id, name.trim(), isActive, icon);
    if (!updated) {
        res.status(404).json({ error: 'Payment method not found.' });
        return;
    }
    res.status(204).send();
}

export async function deletePaymentMethod(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'id is required.' });
        return;
    }

    const deleted = await paymentMethodsService.delete(id);
    if (!deleted) {
        res.status(404).json({ error: 'Payment method not found.' });
        return;
    }
    res.status(204).send();
}
