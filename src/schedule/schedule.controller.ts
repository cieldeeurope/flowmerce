import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { AdminGuard } from 'src/admin-auth/admin.guard';
import { UserGuard } from 'src/user-auth/user.guard';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('create')
  @UseGuards(UserGuard)
  create(@Body() body: any) {
    return this.scheduleService.create(body);
  }

  @Post('notify-collection-started')
  @UseGuards(UserGuard)
  notifyCollectionStarted(
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string,
  ) {
    return this.scheduleService.notifyCollectionStartedManually(
      customId,
      accountPlatform,
    );
  }

  @Get('list')
  @UseGuards(UserGuard)
  list(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
    @Query('status') status?: string,
    @Query('site') site?: string,
  ) {
    return this.scheduleService.find(customId, accountPlatform, status, site);
  }

  @Get()
  @UseGuards(AdminGuard)
  find(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
    @Query('status') status?: string,
    @Query('site') site?: string,
  ) {
    return this.scheduleService.find(customId, accountPlatform, status, site);
  }

  @Post('delete')
  @UseGuards(AdminGuard)
  deleteSchedules(@Body('ids') ids: number[]) {
    return this.scheduleService.deleteSchedules(ids);
  }

  @Post('delete-user')
  @UseGuards(UserGuard)
  deleteUserSchedules(
    @Body('ids') ids: number[],
    @Body('customId') customId: string,
  ) {
    return this.scheduleService.deleteSchedulesForUser(customId, ids);
  }

  @Post('run/:id')
  @UseGuards(AdminGuard)
  run(
    @Param('id') id: number,
    @Query('index') index: number,
    @Query('total') total: number,
    @Query('runGroup') runGroup?: string,
  ) {
    return this.scheduleService.run(
      Number(id),
      Number(index),
      Number(total),
      runGroup,
    );
  }

  @Get('custom-ids')
  @UseGuards(AdminGuard)
  async getScheduledCustomIds(
    @Query('status') status?: string,
  ) {
    const customIds = await this.scheduleService.getScheduledCustomIds(status);

    return {
      customIds,
    };
  }

  @Get('account-platforms')
  @UseGuards(AdminGuard)
  async getScheduledAccountPlatforms(
    @Query('customId') customId: string,
    @Query('status') status?: string,
  ) {
    if (!customId) {
      return {
        message: 'customId 필수입니다.',
        accountPlatforms: [],
      };
    }

    const accountPlatforms =
      await this.scheduleService.getScheduledAccountPlatforms(customId, status);

    return {
      accountPlatforms,
    };
  }

  @Get('sites')
  @UseGuards(AdminGuard)
  async getScheduledSites(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
    @Query('status') status?: string,
  ) {
    if (!customId || !accountPlatform) {
      return {
        message: 'customId와 accountPlatform이 필수입니다.',
        sites: [],
      };
    }

    const sites = await this.scheduleService.getScheduledSites(
      customId,
      accountPlatform,
      status,
    );

    return {
      sites,
    };
  }
}
