import { LabelsModule } from './../labels/labels.module';
import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationRepository } from './repository/conversation.repository';
import { MessagesModule } from '../messages/messages.module';
import { CompanyUsersModule } from '../company-users/company-users.module';
import { CompanyCustomersModule } from '../company-customers/company-customers.module';
import { CompanyRepository } from '../companies/repository/company.repository';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { CompaniesModule } from '../companies/companies.module';
import { ParticipantRepository } from '../participants/repository/participant.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { LabelRepository } from '../labels/repository/label.repository';
import { ConversationSubscriber } from './entity-subscribers/conversation.subscriber';
import { ActivityLoggerMiddleware } from './middlewares/activity-logger.middleware';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    TypeOrmModule.forFeature([
      //* for current scope
      ConversationRepository,
      CompanyRepository,
      CustomerRepository,
      CompanyCustomerRepository,
      ParticipantRepository,
      LabelRepository,
    ]),
    CompanyUsersModule,
    forwardRef(() => CompanyCustomersModule),
    CompaniesModule,
    NotificationsModule,
    LabelsModule,
    UsersModule,
    forwardRef(() => CustomersModule),
  ],
  providers: [ConversationsService, ConversationSubscriber],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ActivityLoggerMiddleware)

      .forRoutes(
        {
          path: ':splat*?/conversations/*',
          method: RequestMethod.PUT,
        },
        {
          path: ':splat*?/conversations/:id',
          method: RequestMethod.PATCH,
        },
        {
          path: ':splat*?/conversations/',
          method: RequestMethod.PATCH,
        },
      );
  }
}
