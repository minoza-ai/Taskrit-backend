import mongoose, { Schema, Document } from 'mongoose';

interface ProjectDocument extends Document {
  project_uuid: string;
  owner_user_uuid: string;
  name: string;
  category: string | null;
  budget: number | null;
  deadline: number | null;
  team_requirements: string | null;
  detailed_description: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    project_uuid: {
      type: String,
      required: true,
      unique: true,
    },
    owner_user_uuid: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      default: null,
      trim: true,
      maxlength: 50,
    },
    budget: {
      type: Number,
      default: null,
      min: 0,
    },
    deadline: {
      type: Number,
      default: null,
    },
    team_requirements: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    detailed_description: {
      type: String,
      default: null,
      maxlength: 3000,
    },
    created_at: {
      type: Number,
      required: true,
    },
    updated_at: {
      type: Number,
      required: true,
    },
    deleted_at: {
      type: Number,
      default: null,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

projectSchema.index({ owner_user_uuid: 1, updated_at: -1 });
projectSchema.index({ owner_user_uuid: 1, deleted_at: 1 });

export const Project = mongoose.model<ProjectDocument>('Project', projectSchema);
