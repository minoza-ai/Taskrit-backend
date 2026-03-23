import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Asset } from '../models/Asset';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const ASSET_DIR = path.join(process.cwd(), UPLOAD_DIR, 'assets');
const TEAMING_ENGINE_URL = process.env.TEAMING_ENGINE_URL || 'http://localhost:3002';
const HMAC_KEY = process.env.HMAC_KEY || '';

export class AssetService {
  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(ASSET_DIR);
    } catch {
      await fs.mkdir(ASSET_DIR, { recursive: true });
    }
  }

  private generateHmac(message: string): string {
    const hmac = crypto.createHmac('sha256', HMAC_KEY);
    hmac.update(message);
    return hmac.digest('hex');
  }

  async createAsset(owner_uuid: string, name: string, description: string, file: Express.Multer.File) {
    const asset_uuid = uuidv4();
    const filename = `${asset_uuid}-${Date.now()}-${file.originalname}`;
    const filePath = path.join(ASSET_DIR, filename);

    // 1. Save File
    await fs.writeFile(filePath, file.buffer);
    const file_url = `/uploads/assets/${filename}`;

    // 2. Save DB Record
    const asset = await Asset.create({
      asset_uuid,
      owner_user_uuid: owner_uuid,
      name,
      description,
      file_url,
    });

    // 3. Sync with Teaming Engine
    if (TEAMING_ENGINE_URL) {
      try {
        const hmac = this.generateHmac(asset_uuid);
        const response = await fetch(`${TEAMING_ENGINE_URL}/Account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: asset_uuid,
            type: 'asset',
            abilityText: description,
            cost: 0,
            hmac: hmac,
          }),
        });

        if (!response.ok) {
          console.error('Failed to sync asset to Teaming Engine:', await response.text());
          // Optional: rollback DB/File or just log error? For now log error.
        }
      } catch (error) {
        console.error('Error connecting to Teaming Engine:', error);
      }
    }

    return asset;
  }

  async getMyAssets(owner_uuid: string) {
    return Asset.find({ owner_user_uuid: owner_uuid }).sort({ created_at: -1 });
  }

  async deleteAsset(asset_uuid: string, owner_uuid: string) {
    const asset = await Asset.findOne({ asset_uuid, owner_user_uuid: owner_uuid });
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Delete file
    const filename = path.basename(asset.file_url);
    const filePath = path.join(ASSET_DIR, filename);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Failed to delete asset file:', err);
    }

    // Delete DB record
    await Asset.deleteOne({ _id: asset._id });
    
    // Note: Teaming engine currently has no delete API mentioned, so we skip syncing delete.
  }
}

export const assetService = new AssetService();
