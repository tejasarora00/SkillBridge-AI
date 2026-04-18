import mongoose from 'mongoose';

const candidateMatchSchema = new mongoose.Schema(
  {
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true
    },
    jobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: true
    },
    fitScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    explanation: {
      type: String,
      default: ''
    },
    recruiterDecision: {
      type: String,
      enum: ['new', 'shortlisted', 'discarded'],
      default: 'new'
    },
    decisionUpdatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const CandidateMatch =
  mongoose.models.CandidateMatch || mongoose.model('CandidateMatch', candidateMatchSchema);
