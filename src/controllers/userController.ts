import { Response } from 'express';
import { RequestWithUser, UpdateUserRequest } from '../types';
import { userService } from '../services/userService';

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
        wallet_address: user.wallet_address,
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
}

export const userController = new UserController();
