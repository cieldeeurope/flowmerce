import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordReplacement } from './word-replacement.entity';
import { WordReplacementService } from './word-replacement.service';
import { WordReplacementController } from './word-replacement.controller';
import { UserAuthModule } from 'src/user-auth/user-auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([WordReplacement]), UserAuthModule],
  providers: [WordReplacementService],
  controllers: [WordReplacementController],
  exports: [WordReplacementService],
})
export class WordReplacementModule {}
