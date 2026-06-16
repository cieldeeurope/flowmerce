import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

type UserTokenPayload = {
  sub: string;
  customId: string;
  role: 'user';
  iat: number;
  exp: number;
};

@Injectable()
export class UserAuthService {
  private get tokenSecret() {
    return (
      process.env.USER_AUTH_SECRET ||
      process.env.ADMIN_AUTH_SECRET ||
      process.env.ADMIN_PASSWORD ||
      ''
    ).trim();
  }

  private get tokenTtlHours() {
    const rawValue = Number.parseInt(
      process.env.USER_AUTH_TOKEN_TTL_HOURS || '12',
      10,
    );

    if (Number.isNaN(rawValue) || rawValue <= 0) {
      return 12;
    }

    return rawValue;
  }

  issueUserToken(loginId: string, customId: string) {
    if (!this.tokenSecret) {
      throw new InternalServerErrorException(
        '유저 인증 설정이 올바르지 않습니다. USER_AUTH_SECRET을 확인해주세요.',
      );
    }

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload: UserTokenPayload = {
      sub: loginId,
      customId,
      role: 'user',
      iat: now,
      exp: now + this.tokenTtlHours * 60 * 60,
    };

    const encodedHeader = this.encodeSegment(header);
    const encodedPayload = this.encodeSegment(payload);
    const signature = this.createSignature(encodedHeader, encodedPayload);

    return {
      token: `${encodedHeader}.${encodedPayload}.${signature}`,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  }

  verifyUserToken(token: string): UserTokenPayload | null {
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
      ) as UserTokenPayload;

      if (payload.role !== 'user') {
        return null;
      }

      if (!payload.customId?.trim()) {
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
