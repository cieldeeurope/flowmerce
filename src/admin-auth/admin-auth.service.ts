import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

type AdminTokenPayload = {
  sub: string;
  role: 'admin';
  iat: number;
  exp: number;
};

type LoginAttemptState = {
  count: number;
  blockedUntil: number;
};

@Injectable()
export class AdminAuthService {
  private readonly attempts = new Map<string, LoginAttemptState>();

  private get tokenSecret() {
    return (
      process.env.ADMIN_AUTH_SECRET ||
      process.env.ADMIN_PASSWORD ||
      ''
    ).trim();
  }

  private get tokenTtlHours() {
    const rawValue = Number.parseInt(
      process.env.ADMIN_AUTH_TOKEN_TTL_HOURS || '12',
      10,
    );

    if (Number.isNaN(rawValue) || rawValue <= 0) {
      return 12;
    }

    return rawValue;
  }

  private get maxLoginAttempts() {
    const rawValue = Number.parseInt(
      process.env.ADMIN_LOGIN_MAX_ATTEMPTS || '5',
      10,
    );

    if (Number.isNaN(rawValue) || rawValue <= 0) {
      return 5;
    }

    return rawValue;
  }

  private get blockMinutes() {
    const rawValue = Number.parseInt(
      process.env.ADMIN_LOGIN_BLOCK_MINUTES || '10',
      10,
    );

    if (Number.isNaN(rawValue) || rawValue <= 0) {
      return 10;
    }

    return rawValue;
  }

  buildLoginAttemptKey(loginId: string, ipAddress?: string) {
    return `${(ipAddress || 'unknown').trim()}::${loginId.trim().toLowerCase()}`;
  }

  assertLoginAllowed(attemptKey: string) {
    const state = this.attempts.get(attemptKey);

    if (!state) {
      return;
    }

    if (state.blockedUntil > Date.now()) {
      throw new HttpException(
        '관리자 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.attempts.delete(attemptKey);
  }

  registerLoginFailure(attemptKey: string) {
    const previousState = this.attempts.get(attemptKey) || {
      count: 0,
      blockedUntil: 0,
    };

    const nextCount = previousState.count + 1;

    if (nextCount >= this.maxLoginAttempts) {
      this.attempts.set(attemptKey, {
        count: 0,
        blockedUntil: Date.now() + this.blockMinutes * 60 * 1000,
      });
      return;
    }

    this.attempts.set(attemptKey, {
      count: nextCount,
      blockedUntil: 0,
    });
  }

  clearLoginFailures(attemptKey: string) {
    this.attempts.delete(attemptKey);
  }

  issueAdminToken(loginId: string) {
    if (!this.tokenSecret) {
      throw new InternalServerErrorException(
        '관리자 보안 설정이 올바르지 않습니다. ADMIN_AUTH_SECRET을 확인해주세요.',
      );
    }

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload: AdminTokenPayload = {
      sub: loginId,
      role: 'admin',
      iat: now,
      exp: now + this.tokenTtlHours * 60 * 60,
    };

    const encodedHeader = this.encodeSegment(header);
    const encodedPayload = this.encodeSegment(payload);
    const signature = this.createSignature(encodedHeader, encodedPayload);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verifyAdminToken(token: string): AdminTokenPayload | null {
    try {
      if (!token || !this.tokenSecret) {
        return null;
      }

      const [encodedHeader, encodedPayload, signature] = token.split('.');

      if (!encodedHeader || !encodedPayload || !signature) {
        return null;
      }

      const expectedSignature = this.createSignature(
        encodedHeader,
        encodedPayload,
      );

      if (!this.safeEquals(signature, expectedSignature)) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as AdminTokenPayload;

      if (payload.role !== 'admin') {
        return null;
      }

      if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private encodeSegment(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private createSignature(encodedHeader: string, encodedPayload: string) {
    return createHmac('sha256', this.tokenSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
  }

  private safeEquals(left: string, right: string) {
    const leftBuffer = Uint8Array.from(Buffer.from(left, 'utf8'));
    const rightBuffer = Uint8Array.from(Buffer.from(right, 'utf8'));

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
