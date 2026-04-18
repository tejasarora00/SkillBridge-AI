import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    interests: {
      type: [String],
      default: [],
      validate: [(value) => Array.isArray(value), 'Interests must be an array.']
    },
    currentSkills: {
      type: [String],
      default: [],
      validate: [(value) => Array.isArray(value), 'Current skills must be an array.']
    },
    targetCareer: {
      type: String,
      trim: true,
      default: ''
    },
    educationLevel: {
      type: String,
      trim: true,
      default: ''
    },
    roadmapSummary: {
      type: String,
      default: ''
    },
    roadmapSnapshot: {
      type: new mongoose.Schema(
        {
          currentStrengths: { type: [String], default: [] },
          missingSkills: { type: [String], default: [] },
          recommendedNextSteps: { type: [String], default: [] },
          beginnerProject: { type: String, default: '' },
          intermediateProject: { type: String, default: '' },
          learningRoadmap: { type: [String], default: [] }
        },
        { _id: false }
      ),
      default: () => ({})
    },
    overallSkillScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    latestRoadmapMilestones: {
      type: [
        new mongoose.Schema(
          {
            title: { type: String, required: true },
            timeline: { type: String, required: true },
            focus: { type: String, required: true },
            output: { type: String, required: true }
          },
          { _id: false }
        )
      ],
      default: []
    },
    uploadedResume: {
      type: new mongoose.Schema(
        {
          fileName: { type: String, default: '' },
          mimeType: { type: String, default: '' },
          dataBase64: { type: String, default: '' },
          extractedText: { type: String, default: '' },
          uploadedAt: { type: Date, default: null }
        },
        { _id: false }
      ),
      default: () => ({})
    },
    profileCompleteness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const StudentProfile =
  mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema);
