import { RateLimitStore } from '../types';

const store: RateLimitStore = {};

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15분
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5');
const LOCK_TIME = parseInt(process.env.RATE_LIMIT_LOCK_TIME || '600000'); // 10분

export const rateLimitUtil = {
  /**
   * Rate Limit 체크
   * @param key 사용자 식별자 (예: user_id, IP)
   * @returns 허용 여부 및 남은 시간(ms) 또는 Lock 해제 시간
   */
  checkLimit(key: string): { allowed: boolean; lockedUntil?: number } {
    const now = Date.now();
    const record = store[key];

    // 기존 기록이 없거나 윈도우가 만료된 경우
    if (!record || now > record.resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + WINDOW_MS,
      };
      return { allowed: true };
    }

    // 현재 Lock 상태 확인
    if (record.lockedUntil && now < record.lockedUntil) {
      return { allowed: false, lockedUntil: record.lockedUntil };
    }

    // Lock 상태 해제
    if (record.lockedUntil && now >= record.lockedUntil) {
      record.lockedUntil = undefined;
      record.count = 1;
      record.resetTime = now + WINDOW_MS;
      return { allowed: true };
    }

    // 요청 수 증가
    record.count++;

    // 최대 요청 수 초과
    if (record.count > MAX_REQUESTS) {
      record.lockedUntil = now + LOCK_TIME;
      return { allowed: false, lockedUntil: record.lockedUntil };
    }

    return { allowed: true };
  },

  /**
   * 특정 키의 Rate Limit 초기화
   */
  reset(key: string): void {
    delete store[key];
  },

  /**
   * 모든 Rate Limit 초기화 (테스트용)
   */
  resetAll(): void {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  },

  /**
   * 만료된 기록 정리
   */
  cleanup(): void {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      const record = store[key];
      if (now > record.resetTime && !record.lockedUntil) {
        delete store[key];
      }
    });
  },
};

// 매분마다 정기적으로 정리
setInterval(() => {
  rateLimitUtil.cleanup();
}, 60000);
