import { Response } from 'express';
import { RequestWithUser } from '../types';
import { passwordUtil } from '../utils/password';

export class TestController {
	/**
	 * 비밀번호 해싱 테스트 엔드포인트 (개발용)
	 */
	async hashPassword(req: RequestWithUser, res: Response): Promise<void> {
		try {
			// 개발 환경에서만 허용
			if (process.env.NODE_ENV === 'production') {
				res.status(403).json({ error: 'This endpoint is not available in production' });
				return;
			}

			const { password } = req.body;

			if (!password) {
				res.status(400).json({ error: 'password is required' });
				return;
			}

			// 비밀번호 해싱
			const hashedPassword = await passwordUtil.hash(password);

			res.status(200).json({
				hashed_password: hashedPassword,
				message: 'Use hashed_password in login/register requests',
			});
		} catch (err: any) {
			res.status(500).json({ error: err.message || 'Internal server error' });
		}
	}
}

export const testController = new TestController();
