import { Response } from 'express';
import { RequestWithUser } from '../types';
import { assetService } from '../services/assetService';

export class AssetController {
  async create(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Handle potentially multiple files? The service expects one. Let's assume single file for Create.
      const file = req.file as Express.Multer.File;
      const { name, description } = req.body;

      if (!name || !description) {
        res.status(400).json({ error: 'Name and description required' });
        return;
      }

      const asset = await assetService.createAsset(
        req.user.user_uuid,
        name,
        description,
        file
      );

      res.status(201).json(asset);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  async listMyAssets(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const assets = await assetService.getMyAssets(req.user.user_uuid);
      res.status(200).json(assets);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to list assets' });
    }
  }

  async delete(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { asset_uuid } = req.params;
      await assetService.deleteAsset(asset_uuid, req.user.user_uuid);
      res.status(204).send();
    } catch (err: any) {
      if (err.message === 'Asset not found') {
        res.status(404).json({ error: 'Asset not found' });
      } else {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete asset' });
      }
    }
  }
}

export const assetController = new AssetController();
