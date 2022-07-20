import { Module } from '@nestjs/common';
import { LogActivitiesController } from './log-activities.controller';
import { LogActivitiesService } from './log-activities.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogActivityRepository } from './repository/log-activities.repository';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LogActivityRepository]),
    UsersModule,
    CompaniesModule,
  ],
  controllers: [LogActivitiesController],
  providers: [LogActivitiesService],
  exports: [LogActivitiesService],
})
export class LogActivitiesModule {}
