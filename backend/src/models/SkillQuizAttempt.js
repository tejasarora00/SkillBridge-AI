import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: { type: [String], required: true },
    correctOption: { type: Number, required: true, min: 0, max: 3 }
  },
  { _id: false }
);

const skillQuizAttemptSchema = new mongoose.Schema(
  {
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    skillCategory: { type: String, required: true, trim: true },
    questionCount: { type: Number, required: true, min: 5, max: 20 },
    questions: { type: [quizQuestionSchema], required: true },
    answers: { type: [Number], default: [] },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const SkillQuizAttempt =
  mongoose.models.SkillQuizAttempt || mongoose.model('SkillQuizAttempt', skillQuizAttemptSchema);
