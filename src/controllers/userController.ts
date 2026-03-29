import { Response } from 'express';
import { RequestWithUser, UpdateUserRequest } from '../types';
import { userService } from '../services/userService';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export class UserController {
  /**
   * 현재 사용자 정보 조회
   */
  async getMe(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userService.getUserByUuid(req.user.user_uuid);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({
        user_uuid: user.user_uuid,
        user_id: user.user_id,
        nickname: user.nickname,
        profile_bio: user.profile_bio,
        capabilities: user.capabilities,
        wallet_address: user.wallet_address,
        profile_image_url: user.profile_image_url,
        otp_enabled: user.otp_enabled,
        created_at: user.created_at,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * 현재 사용자 정보 수정
   */
  async updateMe(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updateReq: UpdateUserRequest = {
        nickname: req.body.nickname,
        password: req.body.password,
        profile_bio: typeof req.body.profile_bio === 'string' ? req.body.profile_bio : undefined,
        capabilities: Array.isArray(req.body.capabilities) ? req.body.capabilities : undefined,
      };

      await userService.updateUser(req.user.user_uuid, updateReq);

      res.status(200).json({ message: 'User updated successfully' });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  /**
   * 현재 사용자 삭제 (Soft Delete)
   */
  async deleteMe(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await userService.deleteUser(req.user.user_uuid);

      res.status(200).json({ message: 'User account deleted successfully' });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  /**
   * 프로필 이미지 업로드
   */
  async uploadProfileImage(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const user_uuid = req.user.user_uuid;
      const fileBuffer = req.file.buffer;
      const filename = `${user_uuid}-${Date.now()}.webp`;
      const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

      // Ensure upload directory exists
      try {
        await fs.access(uploadDir);
      } catch {
        await fs.mkdir(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // Process image with sharp
      await sharp(fileBuffer)
        .resize(500, 500, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(filePath);

      const profile_image_url = `/uploads/${filename}`;

      const updatedUser = await userService.updateProfileImage(user_uuid, profile_image_url);

      res.status(200).json({
        user_uuid: updatedUser.user_uuid,
        user_id: updatedUser.user_id,
        nickname: updatedUser.nickname,
        profile_bio: updatedUser.profile_bio,
        capabilities: updatedUser.capabilities,
        wallet_address: updatedUser.wallet_address,
        profile_image_url: updatedUser.profile_image_url,
        otp_enabled: updatedUser.otp_enabled,
        created_at: updatedUser.created_at,
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOtpStatus(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await userService.getOtpStatus(req.user.user_uuid);
      res.status(200).json(status);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async setupOtp(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const setup = await userService.createOtpSetup(req.user.user_uuid);
      res.status(200).json(setup);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async enableOtp(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
      if (!code) {
        res.status(400).json({ error: 'OTP code is required' });
        return;
      }

      await userService.enableOtp(req.user.user_uuid, code);
      res.status(200).json({ message: 'OTP enabled successfully' });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  async disableOtp(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
      if (!code) {
        res.status(400).json({ error: 'OTP code is required' });
        return;
      }

      await userService.disableOtp(req.user.user_uuid, code);
      res.status(200).json({ message: 'OTP disabled successfully' });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }
}

export const userController = new UserController();
