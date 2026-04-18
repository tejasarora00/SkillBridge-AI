import mongoose from 'mongoose';

const expertSessionRequestSchema = new mongoose.Schema(
  {
    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    slotLabel: {
      type: String,
      required: true,
      trim: true
    },
    slotStart: {
      type: Date,
      required: true
    },
    slotEnd: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

export const ExpertSessionRequest =
  mongoose.models.ExpertSessionRequest ||
  mongoose.model('ExpertSessionRequest', expertSessionRequestSchema);
