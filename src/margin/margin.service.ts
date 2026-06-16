import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Margin } from './margin.entity';
import { MarginDTO } from './margin.dto';
import { HostingAccount } from '../hosting/hostingaccount.entity';

@Injectable()
export class MarginService {
  constructor(
    @InjectRepository(Margin)
    private readonly marginRepository: Repository<Margin>,
    @InjectRepository(HostingAccount)
    private readonly hostingRepo: Repository<HostingAccount>,
  ) {}

  async saveMargin(dto: MarginDTO): Promise<Margin> {
    const account = await this.hostingRepo.findOne({
      where: {
        customId: dto.customId,
        accountPlatform: dto.accountPlatform,
      },
    });

    if (!account) {
      throw new Error('유효하지 않은 accountPlatform입니다.');
    }

    let margin;

    if (dto.id) {
      margin = await this.marginRepository.findOne({
        where: {
          id: dto.id,
          customId: dto.customId,
          accountPlatform: dto.accountPlatform,
        },
      });

      if (!margin) {
        throw new Error('수정 권한이 없는 마진 데이터입니다.');
      }
    } else {
      margin = new Margin();
    }

    Object.assign(margin, dto);

    return this.marginRepository.save(margin);
  }

  async getAllMargins(customId: string, accountPlatform: string) {
    return this.marginRepository.find({
      where: { customId, accountPlatform },
      order: { site: 'ASC' },
    });
  }

  async deleteMargin(id: number, customId: string) {
    return this.marginRepository.delete({
      id,
      customId,
    });
  }
}
