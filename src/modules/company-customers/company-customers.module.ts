import { Module } from '@nestjs/common';
import { CompanyCustomersService } from './company-customers.service';
import { CompanyCustomersController } from './company-customers.controller';
import { CompanyCustomerRepository } from './repository/company-customer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsModule } from '../participants/participants.module';
import { CompanyUsersModule } from '../company-users/company-users.module';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { CompanyRepository } from '../companies/repository/company.repository';
import { ConversationRepository } from '../conversations/repository/conversation.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyCustomerRepository,
      CustomerRepository,
      CompanyRepository,
      ConversationRepository,
    ]),
    CompanyUsersModule,
    ParticipantsModule,
    CompanyUsersModule,
  ],
  controllers: [CompanyCustomersController],
  providers: [CompanyCustomersService],
  exports: [CompanyCustomersService],
})
export class CompanyCustomersModule {}
