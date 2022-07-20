import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyRepository } from '../companies/repository/company.repository';
import { CompanyLabelRepository } from '../company-labels/repository/company-label.repository';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';
import { LabelRepository } from './repository/label.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabelRepository,
      CompanyLabelRepository,
      CompanyRepository,
    ]),
  ],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
