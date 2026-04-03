import mongoose, { Schema, Document } from 'mongoose';

interface ReportDocument extends Document {
  reporter_uuid: string;
  reported_uuid: string;
  reason: string;
  created_at: number;
}

const reportSchema = new Schema<ReportDocument>(
  {
    reporter_uuid: {
      type: String,
      required: true,
    },
    reported_uuid: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    created_at: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

reportSchema.index({ reporter_uuid: 1, reported_uuid: 1 });
reportSchema.index({ created_at: -1 });

export const Report = mongoose.model<ReportDocument>('Report', reportSchema);
