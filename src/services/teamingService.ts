import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { TeamingMatchResult, TeamingMatchSuggestRequest } from '../types';

interface TeamingTaskCreateBody {
  accountId: string;
  request: string;
  requiredDate: number;
  requiredElo: number;
  requiredCost: number;
  requireHuman: boolean;
  maxCost: number;
  hmac: string;
}

interface TeamingAccountCreateBody {
  accountId: string;
  userId?: string;
  nickname?: string;
  type: 'human';
  abilityText: string;
  cost: number;
  skipAi?: boolean;
  hmac: string;
}

interface TeamingAccountUpdateBody {
  abilityText: string;
  userId?: string;
  nickname?: string;
  skipAi?: boolean;
  hmac: string;
}

interface UpsertHumanAccountOptions {
  skipAi?: boolean;
  userId?: string;
  nickname?: string;
}

function generateHmac(targetId: string, key: string): string {
  return crypto.createHmac('sha256', key).update(targetId).digest('hex');
}

function requestJson<T>(
  baseUrl: string,
  path: string,
  method: 'POST' | 'PATCH',
  payload: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(path, baseUrl);
    } catch {
      reject(new Error('Invalid Teaming service URL'));
      return;
    }

    const data = JSON.stringify(payload);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        method,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const statusCode = res.statusCode || 500;
          let parsed: any = null;
          if (body) {
            try {
              parsed = JSON.parse(body);
            } catch {
              parsed = { error: body };
            }
          }

          if (statusCode < 200 || statusCode >= 300) {
            const error = new Error(parsed?.detail || parsed?.error || `Teaming request failed: ${statusCode}`);
            (error as any).statusCode = statusCode;
            reject(error);
            return;
          }

          resolve(parsed as T);
        });
      },
    );

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

class TeamingService {
  private readonly baseUrl: string;

  private readonly hmacKey: string;

  constructor() {
    this.baseUrl = process.env.TEAMING_API_BASE || 'http://localhost:3002';
    this.hmacKey = (process.env.HMAC_KEY || '').trim();
  }

  async upsertHumanAccount(accountId: string, profileBio: string, options?: UpsertHumanAccountOptions): Promise<void> {
    if (!this.hmacKey) {
      const error = new Error('Teaming HMAC key is not configured');
      (error as any).statusCode = 500;
      throw error;
    }

    const abilityText = profileBio.trim();
    const hmac = generateHmac(accountId, this.hmacKey);

    const updateBody: TeamingAccountUpdateBody = {
      abilityText,
      userId: options?.userId,
      nickname: options?.nickname,
      skipAi: options?.skipAi,
      hmac,
    };

    try {
      await requestJson(this.baseUrl, `/Account/${encodeURIComponent(accountId)}`, 'PATCH', updateBody);
      return;
    } catch (err: any) {
      if ((err as any).statusCode !== 404) {
        throw err;
      }
    }

    const createBody: TeamingAccountCreateBody = {
      accountId,
      userId: options?.userId,
      nickname: options?.nickname,
      type: 'human',
      abilityText,
      cost: 0,
      skipAi: options?.skipAi,
      hmac,
    };

    await requestJson(this.baseUrl, '/Account', 'POST', createBody);
  }

  async suggestMatches(accountId: string, payload: TeamingMatchSuggestRequest): Promise<TeamingMatchResult[]> {
    if (!this.hmacKey) {
      const error = new Error('Teaming HMAC key is not configured');
      (error as any).statusCode = 500;
      throw error;
    }

    const body: TeamingTaskCreateBody = {
      accountId,
      request: payload.request,
      requiredDate: payload.requiredDate ?? 0,
      requiredElo: payload.requiredElo ?? 0,
      requiredCost: payload.requiredCost ?? 0,
      requireHuman: payload.requireHuman ?? false,
      maxCost: payload.maxCost ?? 0,
      hmac: generateHmac(accountId, this.hmacKey),
    };

    return requestJson<TeamingMatchResult[]>(this.baseUrl, '/Task', 'POST', body);
  }
}

export const teamingService = new TeamingService();
