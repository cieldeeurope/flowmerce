import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';

@Module({
  providers: [AdminAuthService, AdminGuard],
  exports: [AdminAuthService, AdminGuard],
})
export class AdminAuthModule {}
