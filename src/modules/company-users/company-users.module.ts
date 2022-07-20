import { Module } from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUserRepository } from './repository/company-user.repository';
import { ParticipantRepository } from '../participants/repository/participant.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyUserRepository, ParticipantRepository]),
  ],
  providers: [CompanyUsersService],
  exports: [CompanyUsersService],
})
export class CompanyUsersModule {}
