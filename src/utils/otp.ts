import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const OTP_WINDOW = 1;

export const otpUtil = {
  generateSecret(userId: string): { base32: string; otpauth_url: string } {
    const secret = speakeasy.generateSecret({
      name: `Taskrit (${userId})`,
      issuer: 'Taskrit',
      length: 20,
    });

    if (!secret.base32 || !secret.otpauth_url) {
      throw new Error('Failed to generate OTP secret');
    }

    return {
      base32: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  },

  async generateQrDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  },

  verifyToken(secretBase32: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secretBase32,
      encoding: 'base32',
      token,
      window: OTP_WINDOW,
    });
  },
};
