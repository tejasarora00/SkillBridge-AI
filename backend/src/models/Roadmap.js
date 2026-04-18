import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    timeline: { type: String, required: true },
    focus: { type: String, required: true },
    output: { type: String, required: true }
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true
    },
    targetRole: {
      type: String,
      required: true
    },
    summary: {
      type: String,
      required: true
    },
    currentStrengths: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [String],
      default: []
    },
    recommendedNextSteps: {
      type: [String],
      default: []
    },
    beginnerProject: {
      type: String,
      default: ''
    },
    intermediateProject: {
      type: String,
      default: ''
    },
    learningRoadmap: {
      type: [String],
      default: []
    },
    milestones: {
      type: [milestoneSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', roadmapSchema);
