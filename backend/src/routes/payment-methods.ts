import {
    createPaymentMethod,
    deletePaymentMethod,
    getActivePaymentMethods,
    getAllPaymentMethods,
    getPaymentMethodById,
    updatePaymentMethod,
} from '@/controllers/payment-methods';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

router.get('/all', getAllPaymentMethods);
router.get('/active', getActivePaymentMethods);
router.get('/:id', getPaymentMethodById);
router.post('/', authMiddleware, requireRole('owner'), createPaymentMethod);
router.put('/:id', authMiddleware, requireRole('owner'), updatePaymentMethod);
router.delete('/:id', authMiddleware, requireRole('owner'), deletePaymentMethod);

export default router;
