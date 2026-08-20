import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserAuthService } from './user-auth.service';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly userAuthService: UserAuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = String(request.headers.authorization || '');

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    const token = authorization.slice(7).trim();
    const payload = this.userAuthService.verifyUserToken(token);

    if (!payload) {
      throw new UnauthorizedException(
        '로그인 세션이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.',
      );
    }

    request.flowmerceUser = payload;
    request.user = payload;

    const applyUserContext = (container?: Record<string, any>) => {
      if (!container || typeof container !== 'object') {
        return;
      }

      container.customId = payload.customId;
      container.loginId = payload.sub;
    };

    applyUserContext(request.query);
    applyUserContext(request.body);
    applyUserContext(request.params);

    return true;
  }
}
