import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Evidence } from './evidence.entity';
import { EvidencesController } from './evidences.controller';
import { EvidencesService } from './evidences.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evidence]), CommonModule],
  controllers: [EvidencesController],
  providers: [EvidencesService],
  exports: [EvidencesService],
})
export class EvidencesModule {}
