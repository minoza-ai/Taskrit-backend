import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const textEncoder = new TextEncoder();

type SignatureEncoding = 'base58' | 'base64' | 'hex';

function decodeWithEncoding(signature: string, encoding: SignatureEncoding): Uint8Array {
  if (encoding === 'base58') {
    return Uint8Array.from(bs58.decode(signature));
  }

  if (encoding === 'base64') {
    return Uint8Array.from(Buffer.from(signature, 'base64'));
  }

  if (signature.startsWith('0x')) {
    return Uint8Array.from(Buffer.from(signature.slice(2), 'hex'));
  }

  return Uint8Array.from(Buffer.from(signature, 'hex'));
}

function decodeSignature(signature: string, encoding?: SignatureEncoding): Uint8Array | null {
  const trimmed = signature.trim();

  if (encoding) {
    try {
      const bytes = decodeWithEncoding(trimmed, encoding);
      return bytes.length === 64 ? bytes : null;
    } catch (err) {
      return null;
    }
  }

  // Common wallet signatures are base58 or base64. Hex is accepted for compatibility.
  const tryDecoders: SignatureEncoding[] = ['base58', 'base64', 'hex'];

  for (const decoder of tryDecoders) {
    try {
      const bytes = decodeWithEncoding(trimmed, decoder);
      if (bytes && bytes.length === 64) {
        return bytes;
      }
    } catch (err) {
      // Continue trying next decoder.
    }
  }

  return null;
}

export const solanaUtil = {
  getCluster(): string {
    return process.env.SOLANA_CLUSTER || 'devnet';
  },

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch (err) {
      return false;
    }
  },

  normalizeAddress(address: string): string | null {
    try {
      return new PublicKey(address).toBase58();
    } catch (err) {
      return null;
    }
  },

  verifyMessageSignature(
    message: string,
    signature: string,
    expectedAddress: string,
    signatureEncoding?: SignatureEncoding
  ): boolean {
    try {
      const publicKey = new PublicKey(expectedAddress);
      const signatureBytes = decodeSignature(signature, signatureEncoding);

      if (!signatureBytes) {
        return false;
      }

      const messageBytes = textEncoder.encode(message);
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    } catch (err) {
      return false;
    }
  },
};
