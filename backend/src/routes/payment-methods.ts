import {
    createPaymentMethod,
    deletePaymentMethod,
    getActivePaymentMethods,
    getAllPaymentMethods,
    getPaymentMethodById,
    updatePaymentMethod,
} from '@/controllers/payment-methods';
import { Router } from 'express';

const router = Router();

router.get('/all', getAllPaymentMethods);
router.get('/active', getActivePaymentMethods);
router.get('/:id', getPaymentMethodById);
router.post('/', createPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);

export default router;
