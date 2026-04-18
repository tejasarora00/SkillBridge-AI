import express from 'express';
import { getCandidateBrief, listCandidates, updateCandidateDecision } from '../controllers/recruiterController.js';

const router = express.Router();

router.get('/candidates', listCandidates);
router.get('/candidates/:studentProfileId/brief', getCandidateBrief);
router.patch('/candidates/:studentProfileId/decision', updateCandidateDecision);

export default router;
