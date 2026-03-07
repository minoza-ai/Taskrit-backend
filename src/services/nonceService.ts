import { Nonce } from '../models/Nonce';
import { Nonce as INonce } from '../types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const NONCE_EXPIRY_MS = 15 * 60 * 1000; // 15분

export class NonceService {
  /**
   * 새로운 Nonce 생성
   */
  async createNonce(wallet_address: string): Promise<INonce> {
    // 기존의 유효한 Nonce가 있으면 삭제
    const now = Math.floor(Date.now() / 1000);
    await Nonce.deleteMany({
      wallet_address: wallet_address.toLowerCase(),
      expires_at: { $gt: now },
    });

    const nonceId = uuidv4();
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + Math.floor(NONCE_EXPIRY_MS / 1000);

    const record = await Nonce.create({
      id: nonceId,
      wallet_address: wallet_address.toLowerCase(),
      nonce,
      created_at: now,
      expires_at: expiresAt,
    });

    return {
      id: record.id,
      wallet_address: record.wallet_address,
      nonce: record.nonce,
      created_at: record.created_at,
      expires_at: record.expires_at,
    };
  }

  /**
   * Nonce 검증 및 조회
   */
  async verifyNonce(wallet_address: string, nonce: string): Promise<INonce | null> {
    const now = Math.floor(Date.now() / 1000);

    const record = await Nonce.findOne({
      wallet_address: wallet_address.toLowerCase(),
      nonce,
      expires_at: { $gt: now },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      wallet_address: record.wallet_address,
      nonce: record.nonce,
      created_at: record.created_at,
      expires_at: record.expires_at,
    };
  }

  /**
   * Nonce 삭제
   */
  async deleteNonce(nonce: string): Promise<void> {
    await Nonce.deleteOne({ nonce });
  }

  /**
   * 만료된 Nonce 정리
   */
  async cleanupExpiredNonces(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await Nonce.deleteMany({ expires_at: { $lt: now } });
  }
}

export const nonceService = new NonceService();

// 매시간마다 만료된 Nonce 정리
setInterval(async () => {
  await nonceService.cleanupExpiredNonces();
}, 3600000);

