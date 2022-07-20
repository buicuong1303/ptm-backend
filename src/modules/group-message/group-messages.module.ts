import { CompanyRepository } from './../companies/repository/company.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMessagesController } from './group-messages.controller';
import { GroupMessagesService } from './group-messages.service';
import { GroupMessageRepository } from './repository/group-message.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupMessageRepository, CompanyRepository]),
  ],
  controllers: [GroupMessagesController],
  providers: [GroupMessagesService],
  exports: [GroupMessagesService],
})
export class GroupMessagesModule {}
