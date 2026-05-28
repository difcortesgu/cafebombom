import { paymentMethodsService } from '../services';
import type { Request, Response } from 'express';

export async function getAllPaymentMethods(req: Request, res: Response): Promise<void> {
    try {
        const methods = await paymentMethodsService.getAll();
        res.status(200).json(methods);
    } catch (error) {
        console.error('[payment-methods] getAllPaymentMethods failed:', error);
        res.status(500).json({ error: 'Failed to fetch payment methods.' });
    }
}

export async function getActivePaymentMethods(req: Request, res: Response): Promise<void> {
    try {
        const methods = await paymentMethodsService.getActive();
        res.status(200).json(methods);
    } catch (error) {
        console.error('[payment-methods] getActivePaymentMethods failed:', error);
        res.status(500).json({ error: 'Failed to fetch active payment methods.' });
    }
}

export async function getPaymentMethodById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'id is required.' });
        return;
    }

    try {
        const method = await paymentMethodsService.getById(id);
        if (!method) {
            res.status(404).json({ error: 'Payment method not found.' });
            return;
        }
        res.status(200).json(method);
    } catch (error) {
        console.error('[payment-methods] getPaymentMethodById failed:', error);
        res.status(500).json({ error: 'Failed to fetch payment method.' });
    }
}

export async function createPaymentMethod(req: Request, res: Response): Promise<void> {
    const { name, icon } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name is required.' });
        return;
    }

    const iconValue = icon && typeof icon === 'string' ? icon.trim() : 'wallet';

    try {
        const id = await paymentMethodsService.create(name.trim(), iconValue);
        res.status(201).json({ id, name: name.trim(), icon: iconValue, is_active: true });
    } catch (error) {
        console.error('[payment-methods] createPaymentMethod failed:', error);
        if ((error as any)?.message?.includes('unique')) {
            res.status(409).json({ error: 'Payment method already exists.' });
            return;
        }
        res.status(500).json({ error: 'Failed to create payment method.' });
    }
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

    try {
        const updated = await paymentMethodsService.update(id, name.trim(), isActive, icon);
        if (!updated) {
            res.status(404).json({ error: 'Payment method not found.' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('[payment-methods] updatePaymentMethod failed:', error);
        if ((error as any)?.message?.includes('unique')) {
            res.status(409).json({ error: 'Payment method name already exists.' });
            return;
        }
        res.status(500).json({ error: 'Failed to update payment method.' });
    }
}

export async function deletePaymentMethod(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'id is required.' });
        return;
    }

    try {
        const deleted = await paymentMethodsService.delete(id);
        if (!deleted) {
            res.status(404).json({ error: 'Payment method not found.' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('[payment-methods] deletePaymentMethod failed:', error);
        res.status(500).json({ error: 'Failed to delete payment method.' });
    }
}
