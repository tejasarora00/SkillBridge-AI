import mongoose from 'mongoose';

const skillTaskSubmissionSchema = new mongoose.Schema(
  {
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true
    },
    skillCategory: {
      type: String,
      required: true,
      trim: true
    },
    taskPrompt: {
      type: String,
      required: true,
      trim: true
    },
    userSubmission: {
      type: String,
      required: true,
      trim: true
    },
    aiScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    strengths: {
      type: [String],
      default: []
    },
    weaknesses: {
      type: [String],
      default: []
    },
    suggestions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const SkillTaskSubmission =
  mongoose.models.SkillTaskSubmission || mongoose.model('SkillTaskSubmission', skillTaskSubmissionSchema);
