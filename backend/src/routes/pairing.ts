import { Router } from 'express';
import { resolvePairingInfo } from '../utils/network';

const router = Router();

router.get('/info', (_req, res) => {
    const pairing = resolvePairingInfo(process.env.PORT || 3000);
    res.status(200).json(pairing);
});

export default router;
