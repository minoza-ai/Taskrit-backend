import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getMint, getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import bs58 from 'bs58';

export class SettlementService {
  private connection: Connection;
  private masterWallet: Keypair | null = null;
  private tokenMintAddress: PublicKey | null = null;

  private parseMasterSecret(rawSecret: string): Uint8Array | null {
    const trimmed = rawSecret.trim();

    // Supports Phantom/CLI JSON array format: [1,2,3,...]
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return Uint8Array.from(parsed);
        }
      } catch (err) {
        return null;
      }
    }

    // Supports base58 secret key format.
    try {
      return bs58.decode(trimmed);
    } catch (err) {
      return null;
    }
  }

  private toBaseUnits(amount: number, decimals: number): bigint {
    const normalized = amount.toString();
    const safeAmount = normalized.includes('e') || normalized.includes('E')
      ? amount.toFixed(decimals)
      : normalized;

    const [wholePart, fractionPart = ''] = safeAmount.split('.');
    const paddedFraction = (fractionPart + '0'.repeat(decimals)).slice(0, decimals);
    const whole = wholePart || '0';
    const combined = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, '');

    return BigInt(combined || '0');
  }

  constructor() {
    const cluster = process.env.SOLANA_CLUSTER || 'devnet';
    const endpoint =
      cluster === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';

    this.connection = new Connection(endpoint, 'confirmed');

    if (process.env.MASTER_WALLET_SECRET) {
      try {
        const parsedSecret = this.parseMasterSecret(process.env.MASTER_WALLET_SECRET);
        if (!parsedSecret) {
          throw new Error('Unsupported secret key format');
        }
        this.masterWallet = Keypair.fromSecretKey(parsedSecret);
      } catch (err) {
        console.error('Failed to parse MASTER_WALLET_SECRET:', err);
      }
    }

    if (process.env.TASK_TOKEN_MINT) {
      try {
        this.tokenMintAddress = new PublicKey(process.env.TASK_TOKEN_MINT);
      } catch (err) {
        console.error('Failed to parse TASK_TOKEN_MINT:', err);
      }
    }
  }

  get isConfigured() {
    return this.masterWallet !== null && this.tokenMintAddress !== null;
  }

  async settleTokens(userWalletAddress: string, amount: number): Promise<string | null> {
    if (!this.isConfigured || !this.masterWallet || !this.tokenMintAddress) {
      console.warn('SettlementService is not fully configured (missing MASTER_WALLET_SECRET or TASK_TOKEN_MINT)');
      return null;
    }

    if (!userWalletAddress) {
      console.warn('No wallet address provided for settlement.');
      return null;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn(`Invalid settlement amount: ${amount}`);
      return null;
    }

    try {
      const destination = new PublicKey(userWalletAddress);

      // Get or create ATA for master wallet
      const masterAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.masterWallet,
        this.tokenMintAddress,
        this.masterWallet.publicKey
      );

      // Get or create ATA for destination wallet
      const destinationAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.masterWallet, // master pays for ATA creation
        this.tokenMintAddress,
        destination
      );

      // Resolve mint decimals from chain and transfer exact base units.
      const mint = await getMint(this.connection, this.tokenMintAddress);
      const transferAmount = this.toBaseUnits(amount, mint.decimals);

      if (transferAmount <= 0n) {
        console.warn(`Transfer amount resolved to zero: amount=${amount}, decimals=${mint.decimals}`);
        return null;
      }

      const signature = await transfer(
        this.connection,
        this.masterWallet,
        masterAta.address,
        destinationAta.address,
        this.masterWallet.publicKey,
        transferAmount
      );

      console.log(`Settlement completed: sent ${amount} TASK to ${userWalletAddress}. Signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Settlement transaction failed:', error);
      return null;
    }
  }
}

export const settlementService = new SettlementService();
