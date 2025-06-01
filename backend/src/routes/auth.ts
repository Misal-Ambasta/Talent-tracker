import express from 'express';
import { registerRecruiter, loginRecruiter, logoutRecruiter } from '../controllers/authController';

const router = express.Router();

router.post('/register', registerRecruiter);
router.post('/login', loginRecruiter);
router.post('/logout', logoutRecruiter);

export default router; 