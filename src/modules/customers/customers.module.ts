import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module';
import { CompanyCustomersModule } from '../company-customers/company-customers.module';
import { CompanyUsersModule } from '../company-users/company-users.module';
import { ParticipantsModule } from '../participants/participants.module';
import { GroupCustomerRepository } from '../groups-customers/repository/groups-customers.repository';
import { GroupRepository } from '../groups/repository/group.repository';
import { CustomerController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerRepository } from './repository/customer.repository';
import { CustomerCampaignsModule } from '../customer-campaigns/customer-campaigns.module';
import { ActivityLoggerMiddleware } from './middlewares/activity-logger.middleware';
import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerRepository,
      GroupRepository,
      GroupCustomerRepository,
    ]),
    CompaniesModule,
    CompanyCustomersModule,
    CompanyUsersModule,
    ParticipantsModule,
    CustomerCampaignsModule,
    UsersModule,
    ConversationsModule,
  ],
  controllers: [CustomerController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ActivityLoggerMiddleware)

      .forRoutes({
        path: ':splat*?/customers/:id/edit',
        method: RequestMethod.POST,
      });
  }
}
