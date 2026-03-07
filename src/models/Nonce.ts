import mongoose, { Schema, Document } from 'mongoose';
import { Nonce as INonce } from '../types';

interface NonceDocument extends Document {
  id: string;
  wallet_address: string;
  nonce: string;
  created_at: number;
  expires_at: number;
}

const nonceSchema = new Schema<NonceDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    wallet_address: {
      type: String,
      required: true,
      lowercase: true,
    },
    nonce: {
      type: String,
      required: true,
      unique: true,
    },
    created_at: {
      type: Number,
      required: true,
    },
    expires_at: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// TTL 인덱스로 자동 삭제
nonceSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
nonceSchema.index({ wallet_address: 1 });

export const Nonce = mongoose.model<NonceDocument>('Nonce', nonceSchema);
