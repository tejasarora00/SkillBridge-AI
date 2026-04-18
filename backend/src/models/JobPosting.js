import mongoose from 'mongoose';

const jobPostingSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    requiredSkills: {
      type: [String],
      default: [],
      validate: [(value) => Array.isArray(value), 'Required skills must be an array.']
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema);
