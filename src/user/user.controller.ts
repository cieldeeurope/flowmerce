import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserPlan } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuthService } from 'src/admin-auth/admin-auth.service';
import { AdminGuard } from 'src/admin-auth/admin.guard';
import { UserAuthService } from 'src/user-auth/user-auth.service';
import { UserGuard } from 'src/user-auth/user.guard';



@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly adminAuthService: AdminAuthService,
    private readonly userAuthService: UserAuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  @Post('login')
  async login(
    @Body('id') id: string,
    @Body('password') password: string,
  ) {
    const result = await this.userService.validateUser(id, password, {
      allowReservedAdminLogin: false,
    });

    if (!result.success) {
      return result;
    }

    const user = result.user;
    const authSession = this.userAuthService.issueUserToken(
      user.loginId,
      user.customId,
    );

    return {
      success: true,
      loginId: user.loginId,
      customId: user.customId,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      plan: user.plan,
      subscriptionStartAt: user.subscriptionStartAt,
      subscriptionEndAt: user.subscriptionEndAt,
      sites: user.sites ?? [],
      accessToken: authSession.token,
      accessTokenExpiresAt: authSession.expiresAt,
    };
  }

  /*
  * 문의 관련 엔드포인트
  */
  @Post('contact')
  async createContact(
    @Body('type') type: string,
    @Body('title') title: string,
    @Body('name') name: string,
    @Body('phone') phone: string,
    @Body('email') email?: string,
    @Body('content') content?: string,
    @Body('authorLoginId') authorLoginId?: string,
    @Body('authorCustomId') authorCustomId?: string,
  ) {
    return await this.userService.createContact({
      type,
      title,
      name,
      phone,
      email,
      content,
      authorLoginId,
      authorCustomId,
    });
  }

  @Get('contacts')
  @UseGuards(AdminGuard)
  async getContacts() {
    const contacts = await this.userService.getContacts();

    return {
      success: true,
      contacts,
    };
  }

  @Post('contacts/:id/read')
  @UseGuards(AdminGuard)
  async markContactAsRead(
    @Param('id') id: string,
    @Body('readBy') readBy?: string,
  ) {
    return await this.userService.markContactAsRead(Number(id), readBy);
  }


  @Post('uiLogin')
  async uilogin(
    @Body('id') id: string,
    @Body('password') password: string,
  ) {
    const user = await this.userService.validateUserUi(id, password);

    if (!user) {
      return {
        success: false,
        message: '정보를 확인하세요',
      };
    }

    return {
      success: true,
      customId: user.customId,
    };
  }


  @Post('change-password')
  @UseGuards(UserGuard)
    async changePassword(
      @Body('loginId') loginId: string,
      @Body('currentPassword') currentPassword: string,
      @Body('newPassword') newPassword: string,
    ) {
      return await this.userService.changePassword({
        loginId,
        currentPassword,
        newPassword,
      });
  }


  @Get('sites')
  @UseGuards(UserGuard)
  async getUserSites(@Query('customId') customId: string) {
    const user = await this.userRepository.findOne({
      where: { customId },
    });

    if (!user) return [];

    return user.sites;
  }

  @Post('sites')
  @UseGuards(UserGuard)
  async updateSites(
    @Body('customId') customId: string,
    @Body('sites') sites: string[],
  ) {
    return await this.userService.updateSites({
      customId,
      sites,
    });
  }

  @Get('profile')
  @UseGuards(UserGuard)
  async getProfile(@Query('customId') customId: string) {
    return await this.userService.getProfileByCustomId(customId);
  }

  @Post('register')
  async register(
    @Body('loginId') loginId: string,
    @Body('password') password: string,
    @Body('name') name: string,
    @Body('customId') customId: string, // 닉네임
    @Body('phone') phone: string,
    @Body('email') email?: string,
  ) {
    
    return await this.userService.register({
      loginId,
      password,
      name,
      customId,
      phone,
      email,
    });
  }

  @Get('check-id')
  async checkId(@Query('loginId') loginId: string) {
    const user = await this.userRepository.findOne({ where: { loginId } });
    return { available: !user };
  }

  @Get('check-nickname')
  async checkNickname(@Query('customId') customId: string) {
    const user = await this.userRepository.findOne({ where: { customId } });
    return { available: !user };
  }

  @Post('admin/login')
  async adminLogin(
    @Body('id') id: string,
    @Body('password') password: string,
    @Req() request: any,
  ) {
    const attemptKey = this.adminAuthService.buildLoginAttemptKey(
      id,
      request?.ip,
    );

    this.adminAuthService.assertLoginAllowed(attemptKey);

    const result = await this.userService.validateUser(id, password, {
      allowReservedAdminLogin: true,
    });

    if (!result.success) {
      this.adminAuthService.registerLoginFailure(attemptKey);
      throw new UnauthorizedException(
        result.message || '관리자 로그인에 실패했습니다.',
      );
    }

    if (result.user?.role !== 'admin') {
      this.adminAuthService.registerLoginFailure(attemptKey);
      throw new UnauthorizedException('관리자 계정만 접근할 수 있습니다.');
    }

    this.adminAuthService.clearLoginFailures(attemptKey);

    return {
      success: true,
      loginId: result.user.loginId,
      customId: result.user.customId,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      plan: result.user.plan,
      subscriptionStartAt: result.user.subscriptionStartAt,
      subscriptionEndAt: result.user.subscriptionEndAt,
      sites: result.user.sites ?? [],
      adminToken: this.adminAuthService.issueAdminToken(result.user.loginId),
    };
  }

  /*
  * 관리자 User CRUD
  */
  @Get('admin/users')
  @UseGuards(AdminGuard)
  async getAdminUsers() {
    const users = await this.userService.getAdminUsers();

    return {
      success: true,
      users,
    };
  }

  @Post('admin/users')
  @UseGuards(AdminGuard)
  async createAdminUser(
    @Body('name') name: string,
    @Body('loginId') loginId: string,
    @Body('password') password: string,
    @Body('customId') customId: string,
    @Body('phone') phone: string,
    @Body('isApproved') isApproved: boolean,
    @Body('plan') plan: UserPlan,
    @Body('subscriptionStartAt') subscriptionStartAt?: string,
    @Body('subscriptionEndAt') subscriptionEndAt?: string,
    @Body('sites') sites?: string[],
    @Body('email') email?: string,
    @Body('memo') memo?: string,
    @Body('requestUsedCount') requestUsedCount?: number,
    @Body('requestLimitOverride') requestLimitOverride?: number,
    @Body('requestCycleStartAt') requestCycleStartAt?: string,
    @Body('requestCycleEndAt') requestCycleEndAt?: string,
  ) {
    return await this.userService.createAdminUser({
      name,
      loginId,
      password,
      customId,
      phone,
      isApproved,
      plan,
      subscriptionStartAt,
      subscriptionEndAt,
      sites,
      email,
      memo,
      requestUsedCount,
      requestLimitOverride,
      requestCycleStartAt,
      requestCycleEndAt,
    });
  }

  @Put('admin/users/:id')
  @UseGuards(AdminGuard)
  async updateAdminUser(
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('loginId') loginId: string,
    @Body('password') password: string,
    @Body('customId') customId: string,
    @Body('phone') phone: string,
    @Body('isApproved') isApproved: boolean,
    @Body('plan') plan: UserPlan,
    @Body('subscriptionStartAt') subscriptionStartAt?: string,
    @Body('subscriptionEndAt') subscriptionEndAt?: string,
    @Body('sites') sites?: string[],
    @Body('email') email?: string,
    @Body('memo') memo?: string,
    @Body('requestUsedCount') requestUsedCount?: number,
    @Body('requestLimitOverride') requestLimitOverride?: number,
    @Body('requestCycleStartAt') requestCycleStartAt?: string,
    @Body('requestCycleEndAt') requestCycleEndAt?: string,
  ) {
    return await this.userService.updateAdminUser(Number(id), {
      name,
      loginId,
      password,
      customId,
      phone,
      isApproved,
      plan,
      subscriptionStartAt,
      subscriptionEndAt,
      sites,
      email,
      memo,
      requestUsedCount,
      requestLimitOverride,
      requestCycleStartAt,
      requestCycleEndAt,
    });
  }

}
