import express from 'express';
import multer from 'multer';
import {
  compareResumeWithSkills,
  createRoadmap,
  evaluateMockInterview,
  getUploadedResume,
  getAiRuntimeStatus,
  listTaskCategories,
  refineStudentRoadmap,
  startMockInterview,
  submitSkillTask
} from '../controllers/aiController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024
  }
});

router.get('/status', getAiRuntimeStatus);
router.post('/roadmap', createRoadmap);
router.post('/roadmap/refine', refineStudentRoadmap);
router.get('/skill-task-prompts', listTaskCategories);
router.post('/skill-task', submitSkillTask);
router.post('/resume-comparison', upload.single('resumeFile'), compareResumeWithSkills);
router.get('/resume-file', getUploadedResume);
router.get('/mock-interview', startMockInterview);
router.post('/mock-interview', evaluateMockInterview);

export default router;
