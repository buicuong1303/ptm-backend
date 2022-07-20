import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyLabelsService } from './company-labels.service';
import { CompanyLabelRepository } from './repository/company-label.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyLabelRepository])],
  providers: [CompanyLabelsService],
  exports: [CompanyLabelsService],
})
export class CompanyLabelsModule {}
