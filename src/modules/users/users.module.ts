import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailQueueModule } from 'src/modules/queues/modules/email-queue/email-queue.module';
import { CompaniesModule } from '../companies/companies.module';
import { CompanyUsersModule } from '../company-users/company-users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { AwsS3Module } from '../services/http/aws-s3/aws-s3.module';
import { UserRepository } from './repository/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    EmailQueueModule,
    PermissionsModule,
    RolesModule,
    CompanyUsersModule,
    CompaniesModule,
    AwsS3Module,
    TypeOrmModule.forFeature([
      //* for current scope
      UserRepository,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
