import { Module } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';
import { UserGuard } from './user.guard';

@Module({
  providers: [UserAuthService, UserGuard],
  exports: [UserAuthService, UserGuard],
})
export class UserAuthModule {}
