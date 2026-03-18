import { Response } from 'express';
import { RequestWithUser, WalletConnectRequest } from '../types';
import { userService } from '../services/userService';
import { nonceService } from '../services/nonceService';
import { web3Util } from '../utils/web3';

export class WalletController {
  /**
   * 지갑 연동 요청 (Nonce 발급)
   */
  async requestConnect(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { wallet_address } = req.body;

      if (!wallet_address) {
        res.status(400).json({ error: 'wallet_address is required' });
        return;
      }

      if (!web3Util.isValidAddress(wallet_address)) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      // Normalize address to checksum format for consistency
      const normalizedAddress = web3Util.normalizeAddress(wallet_address);
      if (!normalizedAddress) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      const nonce = await nonceService.createNonce(normalizedAddress);
      const message = `Sign this message to verify wallet ownership\nNonce: ${nonce.nonce}`;

      res.status(200).json({
        nonce: nonce.nonce,
        message,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * 지갑 연동 완료 (Signature 검증)
   */
  async confirmConnect(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Login required. Include Authorization: Bearer <access_token>' });
        return;
      }

      const { wallet_address, signature, nonce, message }: WalletConnectRequest = req.body;

      if (!wallet_address || !signature || !nonce) {
        res.status(400).json({ error: 'Missing required fields: wallet_address, signature, nonce' });
        return;
      }

      if (!web3Util.isValidAddress(wallet_address)) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      // Normalize address to checksum format for consistency
      const normalizedRequestAddress = web3Util.normalizeAddress(wallet_address);
      if (!normalizedRequestAddress) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      // Nonce 유효성 검증
      const nonceRecord = await nonceService.verifyNonce(normalizedRequestAddress, nonce);

      if (!nonceRecord) {
        res.status(400).json({ error: 'Invalid or expired nonce' });
        return;
      }

      // Signature 검증
      const messageCandidates = [
        nonce,
        `Sign this message to verify wallet ownership\nNonce: ${nonce}`,
        `Sign this message to verify wallet ownership: ${nonce}`,
      ];

      if (message?.trim()) {
        messageCandidates.unshift(message.trim());
      }

      let recoveredAddress: string | null = null;
      for (const candidate of messageCandidates) {
        recoveredAddress = web3Util.verifySignature(candidate, signature);
        if (recoveredAddress) {
          break;
        }
      }

      if (!recoveredAddress) {
        res.status(401).json({ error: 'Signature verification failed. Sign exact nonce/message from connect request.' });
        return;
      }

      // 복구된 주소와 요청된 주소 일치 확인 (both in checksum format)
      console.log('Wallet address verification:', {
        requested: wallet_address,
        normalized_requested: normalizedRequestAddress,
        recovered: recoveredAddress,
        match: normalizedRequestAddress === recoveredAddress,
      });

      if (normalizedRequestAddress !== recoveredAddress) {
        res.status(401).json({
          error: 'Signature does not match wallet address',
          details: {
            requested: normalizedRequestAddress,
            recovered: recoveredAddress,
          },
        });
        return;
      }

      // 지갑 주소 연결 (이미 checksum format)
      await userService.connectWallet(req.user.user_uuid, normalizedRequestAddress);

      // Nonce 삭제
      await nonceService.deleteNonce(nonce);

      res.status(200).json({ message: 'Wallet connected successfully' });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  /**
   * 지갑 연동 해제
   */
  async disconnect(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await userService.disconnectWallet(req.user.user_uuid);

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}

export const walletController = new WalletController();
