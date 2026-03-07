import mongoose, { Schema, Document } from 'mongoose';

interface UserDocument extends Document {
  user_uuid: string;
  user_id: string;
  nickname: string;
  password: string;
  wallet_address: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

const userSchema = new Schema<UserDocument>(
  {
    user_uuid: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    nickname: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    wallet_address: {
      type: String,
      sparse: true,
      lowercase: true,
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
    deleted_at: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

// 인덱스 생성
userSchema.index({ user_id: 1 });
userSchema.index({ wallet_address: 1 }, { sparse: true, unique: true }); // Unique sparse index
userSchema.index({ deleted_at: 1 });

export const User = mongoose.model<UserDocument>('User', userSchema);
