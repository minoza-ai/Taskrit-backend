import mongoose, { Document, Schema } from 'mongoose';

export interface IAsset extends Document {
  asset_uuid: string;
  owner_user_uuid: string;
  name: string;
  description: string;
  file_url: string;
  created_at: Date;
}

const AssetSchema: Schema = new Schema({
  asset_uuid: { type: String, required: true, unique: true },
  owner_user_uuid: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  file_url: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
