import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = String(request.headers.authorization || '');

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('관리자 인증이 필요합니다.');
    }

    const token = authorization.slice(7).trim();
    const payload = this.adminAuthService.verifyAdminToken(token);

    if (!payload) {
      throw new UnauthorizedException(
        '관리자 인증이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.',
      );
    }

    request.adminUser = payload;
    return true;
  }
}
