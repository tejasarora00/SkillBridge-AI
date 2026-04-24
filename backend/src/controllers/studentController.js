import {
  ExpertSessionRequest,
  Roadmap,
  SkillTaskSubmission,
  StudentProfile,
  TodoItem,
  User
} from '../models/index.js';
import { calculateProfileCompleteness } from '../utils/profile.js';
import {
  invalidateAllRecruiterCandidateSnapshots,
  invalidateRecruiterCandidateBriefsForStudent
} from '../services/recruiterCacheService.js';
import {
  getCachedStudentDashboard,
  getCachedStudentExpertSessions,
  getCachedStudentProfile,
  invalidateStudentDashboardCache,
  invalidateStudentExpertSessionsCache,
  invalidateStudentReadCaches,
  setCachedStudentDashboard,
  setCachedStudentExpertSessions,
  setCachedStudentProfile
} from '../services/studentCacheService.js';

const NAME_PATTERN = /^[A-Za-z]+(?:[A-Za-z\s'.-]*[A-Za-z])?$/;
const PHONE_PATTERN = /^\d{10}$/;
const EXPERT_SESSION_TIMEZONE = 'Asia/Kolkata';
const EXPERT_SESSION_ALLOWED_DAYS = new Set([0, 5, 6]); // Sun, Fri, Sat
const EXPERT_SESSION_ALLOWED_START_HOURS = new Set([0, 1, 18, 19, 20, 21, 22, 23]);
const WEEKDAY_INDEX_BY_SHORT_NAME = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};
const MAX_RESUME_BASE64_LENGTH = 6_000_000;
const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

function getKolkataWeekdayAndHour(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EXPERT_SESSION_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    hour12: false
  }).formatToParts(date);

  const weekdayName = parts.find((part) => part.type === 'weekday')?.value;
  const hourValue = Number(parts.find((part) => part.type === 'hour')?.value);
  const dayIndex = WEEKDAY_INDEX_BY_SHORT_NAME[weekdayName];

  if (Number.isNaN(hourValue) || typeof dayIndex !== 'number') {
    return null;
  }

  return {
    dayIndex,
    hourValue
  };
}

function getPreviousDayIndex(dayIndex) {
  return dayIndex === 0 ? 6 : dayIndex - 1;
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTodoDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getTodoMinimumDueDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() - 1);
  return date;
}

function isTodoDueDateInAllowedWindow(dueDate) {
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const normalizedDueDate = new Date(dueDate);
  normalizedDueDate.setHours(0, 0, 0, 0);
  return normalizedDueDate >= getTodoMinimumDueDate();
}

function sanitizeUploadedResume(uploadedResume = {}) {
  const safeResume =
    uploadedResume && typeof uploadedResume === 'object' ? uploadedResume : {};

  return {
    fileName: String(safeResume.fileName || '').trim(),
    mimeType: String(safeResume.mimeType || '').trim(),
    extractedText: String(safeResume.extractedText || '').trim(),
    uploadedAt: safeResume.uploadedAt || null
  };
}

function normalizeUploadedResume(value, existingResume = null) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const fileName = String(value.fileName || '').trim();
  const mimeType = String(value.mimeType || '').trim();
  const dataBase64 = String(value.dataBase64 || '').trim();
  const extractedText = String(value.extractedText || '').trim();

  if (!fileName && !mimeType && !dataBase64) {
    return null;
  }

  if (!fileName || !mimeType || !dataBase64) {
    if (
      existingResume?.dataBase64 &&
      String(existingResume.fileName || '').trim() === fileName &&
      String(existingResume.mimeType || '').trim() === mimeType
    ) {
      return {
        fileName,
        mimeType,
        dataBase64: String(existingResume.dataBase64 || '').trim(),
        extractedText:
          extractedText || String(existingResume.extractedText || '').trim(),
        uploadedAt: existingResume.uploadedAt || new Date()
      };
    }

    throw new Error('Resume upload is incomplete. Please upload the file again.');
  }

  if (!ALLOWED_RESUME_MIME_TYPES.has(mimeType)) {
    throw new Error('Resume must be a PDF or Word document.');
  }

  if (dataBase64.length > MAX_RESUME_BASE64_LENGTH) {
    throw new Error('Resume file is too large. Please upload a smaller file.');
  }

  return {
    fileName,
    mimeType,
    dataBase64,
    extractedText,
    uploadedAt: new Date()
  };
}

function serializeTodoItem(todo) {
  return {
    id: todo._id.toString(),
    title: todo.title,
    dueDate: todo.dueDate,
    isCompleted: todo.isCompleted,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt
  };
}

function buildTodoCompletionSeries(todoItems) {
  const countsByDay = new Map();
  const today = new Date();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    countsByDay.set(key, 0);
  }

  todoItems.forEach((todo) => {
    if (!todo.completedAt) {
      return;
    }

    const completedKey = new Date(todo.completedAt).toISOString().slice(0, 10);
    if (countsByDay.has(completedKey)) {
      countsByDay.set(completedKey, countsByDay.get(completedKey) + 1);
    }
  });

  return Array.from(countsByDay.entries()).map(([date, completedCount]) => ({
    date,
    completedCount
  }));
}

export async function getStudentProfile(req, res) {
  const studentUserId = req.user._id.toString();
  const cachedProfile = await getCachedStudentProfile(studentUserId);

  if (cachedProfile) {
    return res.json(cachedProfile);
  }

  const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
  if (!profile) {
    const emptyPayload = { profile: null };
    await setCachedStudentProfile(studentUserId, emptyPayload);
    return res.json(emptyPayload);
  }

  const payload = {
    profile: {
      ...profile,
      uploadedResume: sanitizeUploadedResume(profile.uploadedResume)
    }
  };

  await setCachedStudentProfile(studentUserId, payload);

  return res.json(payload);
}

export async function saveStudentProfile(req, res) {
  const existingProfile = await StudentProfile.findOne({ userId: req.user._id }).lean();

  if (req.body.fullName) {
    await User.findByIdAndUpdate(req.user._id, {
      name: String(req.body.fullName).trim()
    });
  }

  const payload = {
    interests: splitList(req.body.interests),
    currentSkills: splitList(req.body.currentSkills),
    targetCareer: String(req.body.targetCareer || '').trim(),
    educationLevel: String(req.body.educationLevel || '').trim()
  };

  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'uploadedResume')) {
      payload.uploadedResume = normalizeUploadedResume(
        req.body.uploadedResume,
        existingProfile?.uploadedResume || null
      );
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  payload.profileCompleteness = calculateProfileCompleteness(payload);

  const profile = await StudentProfile.findOneAndUpdate(
    { userId: req.user._id },
    payload,
    { new: true, upsert: true }
  ).lean();

  await Promise.all([
    invalidateAllRecruiterCandidateSnapshots(),
    invalidateRecruiterCandidateBriefsForStudent(profile._id.toString()),
    invalidateStudentReadCaches(req.user._id.toString())
  ]);

  const responsePayload = {
    message: 'Student profile saved.',
    profile: {
      ...profile,
      uploadedResume: sanitizeUploadedResume(profile.uploadedResume)
    }
  };

  await setCachedStudentProfile(req.user._id.toString(), responsePayload);

  return res.json(responsePayload);
}

export async function saveStudentResume(req, res) {
  if (!req.file?.buffer) {
    return res.status(400).json({ message: 'Please choose a resume file to upload.' });
  }

  const mimeType = String(req.file.mimetype || '').trim();
  if (!ALLOWED_RESUME_MIME_TYPES.has(mimeType)) {
    return res.status(400).json({ message: 'Resume must be a PDF or Word document.' });
  }

  const dataBase64 = req.file.buffer.toString('base64');
  if (dataBase64.length > MAX_RESUME_BASE64_LENGTH) {
    return res.status(400).json({ message: 'Resume file is too large. Please upload a smaller file.' });
  }

  const uploadedResume = {
    fileName: String(req.file.originalname || 'resume').trim(),
    mimeType,
    dataBase64,
    extractedText: '',
    uploadedAt: new Date()
  };

  const profile = await StudentProfile.findOneAndUpdate(
    { userId: req.user._id },
    { uploadedResume },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  await Promise.all([
    invalidateAllRecruiterCandidateSnapshots(),
    invalidateRecruiterCandidateBriefsForStudent(profile._id.toString()),
    invalidateStudentReadCaches(req.user._id.toString())
  ]);

  return res.json({
    message: 'Resume uploaded successfully.',
    uploadedResume: sanitizeUploadedResume(profile.uploadedResume)
  });
}

export async function getStudentDashboard(req, res) {
  const studentUserId = req.user._id.toString();
  const cachedDashboard = await getCachedStudentDashboard(studentUserId);

  if (cachedDashboard) {
    return res.json(cachedDashboard);
  }

  const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();

  if (!profile) {
    return res.status(404).json({ message: 'Student profile not found.' });
  }

  const [latestRoadmap, taskSubmissions, todoItems] = await Promise.all([
    Roadmap.findOne({ studentProfileId: profile._id }).sort({ createdAt: -1 }).lean(),
    SkillTaskSubmission.find({ studentProfileId: profile._id }).sort({ createdAt: -1 }).limit(5).lean(),
    TodoItem.find({ studentUserId: req.user._id }).sort({ dueDate: 1, createdAt: -1 }).lean()
  ]);

  const payload = {
    profile,
    roadmap: latestRoadmap,
    taskSubmissions,
    todoItems: todoItems.map(serializeTodoItem),
    todoCompletionSeries: buildTodoCompletionSeries(todoItems)
  };

  await setCachedStudentDashboard(studentUserId, payload);

  return res.json(payload);
}

export async function createTodoItem(req, res) {
  const title = String(req.body.title || '').trim();
  const dueDate = normalizeTodoDate(req.body.dueDate);

  if (!title) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  if (title.length < 2) {
    return res.status(400).json({ message: 'Task title must be at least 2 characters long.' });
  }

  if (!dueDate) {
    return res.status(400).json({ message: 'Please choose a valid due date.' });
  }

  if (!isTodoDueDateInAllowedWindow(dueDate)) {
    return res.status(400).json({
      message: 'Due date cannot be older than one month from today.'
    });
  }

  const todoItem = await TodoItem.create({
    studentUserId: req.user._id,
    title,
    dueDate
  });

  await invalidateStudentDashboardCache(req.user._id.toString());

  return res.status(201).json({
    message: 'Task added to your to-do list.',
    todoItem: serializeTodoItem(todoItem)
  });
}

export async function updateTodoItem(req, res) {
  const title = String(req.body.title || '').trim();
  const dueDate = normalizeTodoDate(req.body.dueDate);

  if (!title) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  if (title.length < 2) {
    return res.status(400).json({ message: 'Task title must be at least 2 characters long.' });
  }

  if (!dueDate) {
    return res.status(400).json({ message: 'Please choose a valid due date.' });
  }

  if (!isTodoDueDateInAllowedWindow(dueDate)) {
    return res.status(400).json({
      message: 'Due date cannot be older than one month from today.'
    });
  }

  const todoItem = await TodoItem.findOneAndUpdate(
    { _id: req.params.todoId, studentUserId: req.user._id },
    {
      title,
      dueDate
    },
    { new: true }
  ).lean();

  if (!todoItem) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  await invalidateStudentDashboardCache(req.user._id.toString());

  return res.json({
    message: 'Task updated.',
    todoItem: serializeTodoItem(todoItem)
  });
}

export async function toggleTodoItem(req, res) {
  const todoItem = await TodoItem.findOne({ _id: req.params.todoId, studentUserId: req.user._id });

  if (!todoItem) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  todoItem.isCompleted = !todoItem.isCompleted;
  todoItem.completedAt = todoItem.isCompleted ? new Date() : null;
  await todoItem.save();

  await invalidateStudentDashboardCache(req.user._id.toString());

  return res.json({
    message: todoItem.isCompleted ? 'Task marked complete.' : 'Task marked incomplete.',
    todoItem: serializeTodoItem(todoItem)
  });
}

export async function deleteTodoItem(req, res) {
  const todoItem = await TodoItem.findOneAndDelete({
    _id: req.params.todoId,
    studentUserId: req.user._id
  }).lean();

  if (!todoItem) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  await invalidateStudentDashboardCache(req.user._id.toString());

  return res.json({ message: 'Task deleted.' });
}

export async function getStudentExpertSessionRequests(req, res) {
  const studentUserId = req.user._id.toString();
  const cachedRequests = await getCachedStudentExpertSessions(studentUserId);

  if (cachedRequests) {
    return res.json(cachedRequests);
  }

  const requests = await ExpertSessionRequest.find({ studentUserId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  const payload = {
    requests: requests.map((request) => ({
      id: request._id.toString(),
      name: request.name,
      phone: request.phone,
      email: request.email,
      message: request.message,
      slotLabel: request.slotLabel,
      slotStart: request.slotStart,
      slotEnd: request.slotEnd,
      status: request.status,
      createdAt: request.createdAt
    }))
  };

  await setCachedStudentExpertSessions(studentUserId, payload);

  return res.json(payload);
}

export async function createExpertSessionRequest(req, res) {
  const payload = {
    name: String(req.body.name || '').trim(),
    phone: String(req.body.phone || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    message: String(req.body.message || '').trim(),
    slotLabel: String(req.body.slotLabel || '').trim(),
    slotStart: req.body.slotStart,
    slotEnd: req.body.slotEnd
  };

  if (!payload.name || !payload.phone || !payload.email || !payload.message) {
    return res.status(400).json({ message: 'Name, phone, email, and message are required.' });
  }

  if (payload.name.length < 2 || !NAME_PATTERN.test(payload.name)) {
    return res.status(400).json({
      message: 'Please enter a valid name using letters and standard punctuation only.'
    });
  }

  const normalizedPhone = payload.phone.replace(/\D/g, '');
  if (!PHONE_PATTERN.test(normalizedPhone)) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit phone number.' });
  }

  if (!payload.slotLabel || !payload.slotStart || !payload.slotEnd) {
    return res.status(400).json({ message: 'Please select a valid one-hour session slot.' });
  }

  const slotStart = new Date(payload.slotStart);
  const slotEnd = new Date(payload.slotEnd);

  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    return res.status(400).json({ message: 'Selected session slot is invalid.' });
  }

  const durationInMinutes = Math.round((slotEnd.getTime() - slotStart.getTime()) / (1000 * 60));
  if (durationInMinutes !== 60) {
    return res.status(400).json({ message: 'Expert sessions must be booked in one-hour slots.' });
  }

  const slotStartInKolkata = getKolkataWeekdayAndHour(slotStart);
  if (!slotStartInKolkata) {
    return res.status(400).json({ message: 'Selected session slot is invalid.' });
  }

  if (!EXPERT_SESSION_ALLOWED_START_HOURS.has(slotStartInKolkata.hourValue)) {
    return res.status(400).json({
      message: 'Expert sessions are available from 6:00 PM to 2:00 AM only.'
    });
  }

  const bookingDayIndex =
    slotStartInKolkata.hourValue < 2
      ? getPreviousDayIndex(slotStartInKolkata.dayIndex)
      : slotStartInKolkata.dayIndex;

  if (!EXPERT_SESSION_ALLOWED_DAYS.has(bookingDayIndex)) {
    return res.status(400).json({
      message: 'Expert sessions are available only on Friday, Saturday, and Sunday.'
    });
  }

  const request = await ExpertSessionRequest.create({
    studentUserId: req.user._id,
    name: payload.name,
    phone: normalizedPhone,
    email: payload.email,
    message: payload.message,
    slotLabel: payload.slotLabel,
    slotStart,
    slotEnd
  });

  await invalidateStudentExpertSessionsCache(req.user._id.toString());

  return res.status(201).json({
    message: 'Expert session request created.',
    request
  });
}
