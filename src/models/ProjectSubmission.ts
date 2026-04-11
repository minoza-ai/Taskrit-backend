import mongoose, { Schema, Document } from 'mongoose';
import { ProjectSubmissionStatus } from '../types';

interface ProjectSubmissionDocument extends Document {
  submission_uuid: string;
  project_uuid: string;
  submitter_user_uuid: string;
  title: string;
  description: string | null;
  artifact_url: string | null;
  status: ProjectSubmissionStatus;
  settlement_amount: number | null;
  settlement_signature: string | null;
  created_at: number;
  updated_at: number;
  settled_at: number | null;
}

const projectSubmissionSchema = new Schema<ProjectSubmissionDocument>(
  {
    submission_uuid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    project_uuid: {
      type: String,
      required: true,
      index: true,
    },
    submitter_user_uuid: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      default: null,
      maxlength: 5000,
    },
    artifact_url: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['submitted', 'approved', 'rejected'],
      default: 'submitted',
      index: true,
    },
    settlement_amount: {
      type: Number,
      default: null,
      min: 0,
    },
    settlement_signature: {
      type: String,
      default: null,
    },
    created_at: {
      type: Number,
      required: true,
    },
    updated_at: {
      type: Number,
      required: true,
    },
    settled_at: {
      type: Number,
      default: null,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

projectSubmissionSchema.index({ project_uuid: 1, created_at: -1 });
projectSubmissionSchema.index({ project_uuid: 1, status: 1 });
projectSubmissionSchema.index({ submitter_user_uuid: 1, created_at: -1 });

export const ProjectSubmission = mongoose.model<ProjectSubmissionDocument>(
  'ProjectSubmission',
  projectSubmissionSchema,
);
