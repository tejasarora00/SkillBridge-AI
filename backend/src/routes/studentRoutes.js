import express from 'express';
import multer from 'multer';
import {
  createTodoItem,
  createExpertSessionRequest,
  deleteTodoItem,
  getStudentDashboard,
  getStudentExpertSessionRequests,
  getStudentProfile,
  saveStudentProfile,
  saveStudentResume,
  toggleTodoItem,
  updateTodoItem
} from '../controllers/studentController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024
  }
});

router.get('/profile', getStudentProfile);
router.put('/profile', saveStudentProfile);
router.post('/profile/resume', upload.single('resumeFile'), saveStudentResume);
router.get('/dashboard', getStudentDashboard);
router.get('/expert-sessions', getStudentExpertSessionRequests);
router.post('/expert-sessions', createExpertSessionRequest);
router.post('/todos', createTodoItem);
router.put('/todos/:todoId', updateTodoItem);
router.patch('/todos/:todoId/toggle', toggleTodoItem);
router.delete('/todos/:todoId', deleteTodoItem);

export default router;
