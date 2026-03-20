import { Response } from 'express';
import { RequestWithUser, WalletConnectRequest } from '../types';
import { userService } from '../services/userService';
import { nonceService } from '../services/nonceService';
import { solanaUtil } from '../utils/solana';

const toHex = (value: string): string => Buffer.from(value, 'utf8').toString('hex');

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

      if (!solanaUtil.isValidAddress(wallet_address)) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      const normalizedAddress = solanaUtil.normalizeAddress(wallet_address);
      if (!normalizedAddress) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      const nonce = await nonceService.createNonce(normalizedAddress);
      const message = [
        'Taskrit Wallet Verification',
        `Network: solana-${solanaUtil.getCluster()}`,
        `Wallet: ${normalizedAddress}`,
        `Nonce: ${nonce.nonce}`,
      ].join('\n');

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

      const { wallet_address, signature, nonce, message, signature_encoding }: WalletConnectRequest = req.body;

      if (!wallet_address || !signature || !nonce) {
        res.status(400).json({ error: 'Missing required fields: wallet_address, signature, nonce' });
        return;
      }

      if (!solanaUtil.isValidAddress(wallet_address)) {
        res.status(422).json({ error: 'Invalid wallet address' });
        return;
      }

      const normalizedRequestAddress = solanaUtil.normalizeAddress(wallet_address);
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

      const defaultMessage = [
        'Taskrit Wallet Verification',
        `Network: solana-${solanaUtil.getCluster()}`,
        `Wallet: ${normalizedRequestAddress}`,
        `Nonce: ${nonce}`,
      ].join('\n');

      // Frontend implementations may differ in newline handling (\n vs \r\n vs escaped "\\n").
      // Build a deduplicated candidate set so valid signatures do not fail due to formatting differences.
      const candidateSet = new Set<string>();
      const baseMessages = [defaultMessage, nonce];

      if (message?.trim()) {
        baseMessages.unshift(message.trim());
      }

      for (const base of baseMessages) {
        const normalizedLf = base.replace(/\r\n/g, '\n');
        const normalizedCrlf = normalizedLf.replace(/\n/g, '\r\n');
        const escapedNewline = normalizedLf.replace(/\n/g, '\\n');
        const unescapedNewline = base.replace(/\\n/g, '\n');

        candidateSet.add(base);
        candidateSet.add(base.trim());
        candidateSet.add(normalizedLf);
        candidateSet.add(normalizedCrlf);
        candidateSet.add(escapedNewline);
        candidateSet.add(unescapedNewline);
        candidateSet.add(unescapedNewline.replace(/\r\n/g, '\n'));
      }

      const messageCandidates = Array.from(candidateSet).filter(Boolean);

      let matched = false;
      for (const candidate of messageCandidates) {
        if (solanaUtil.verifyMessageSignature(candidate, signature, normalizedRequestAddress, signature_encoding)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        const isDev = process.env.NODE_ENV !== 'production';

        res.status(401).json({
          error: 'Signature does not match wallet address or message',
          details: {
            requested: normalizedRequestAddress,
            expected_message: defaultMessage,
            tip: 'Ensure frontend signs the exact UTF-8 bytes of the message from /wallets/connect/request and sends matching signature_encoding when needed.',
            ...(isDev
              ? {
                  provided_message: message || null,
                  provided_message_hex: message ? toHex(message) : null,
                  expected_message_hex: toHex(defaultMessage),
                  candidate_messages: messageCandidates,
                  candidate_message_hexes: messageCandidates.map((candidate) => toHex(candidate)),
                  signature_encoding: signature_encoding || 'auto',
                  signature_length: signature.length,
                }
              : {}),
          },
        });
        return;
      }

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
