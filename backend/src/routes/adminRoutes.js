import express from 'express';
import {
  createExpertSessionEmailDraft,
  adminLogin,
  deleteAdminManagedUser,
  deleteExpertSessionRequest,
  getAdminOverview
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/overview', requireAdmin, getAdminOverview);
router.post('/expert-sessions/:requestId/email-draft', requireAdmin, createExpertSessionEmailDraft);
router.delete('/expert-sessions/:requestId', requireAdmin, deleteExpertSessionRequest);
router.delete('/users/:userId', requireAdmin, deleteAdminManagedUser);

export default router;
