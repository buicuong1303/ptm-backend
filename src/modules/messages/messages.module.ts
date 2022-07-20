import { AmqpModule } from 'src/modules/services/amqp/amqp.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessageRepository } from './repository/message.repository';
import { ConversationsModule } from '../conversations/conversations.module';
import { ConversationRepository } from '../conversations/repository/conversation.repository';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { CompanyRepository } from '../companies/repository/company.repository';
import { AwsS3Module } from '../services/http/aws-s3/aws-s3.module';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { CompanyUserRepository } from '../company-users/repository/company-user.repository';
import { ParticipantsModule } from '../participants/participants.module';
import { AttachmentRepository } from './repository/attachment.repository';
import { CompanyCustomersModule } from '../company-customers/company-customers.module';
import { CompanyUsersModule } from '../company-users/company-users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SignatureRepository } from '../signatures/repository/signatures.repository';
import { ParticipantRepository } from '../participants/repository/participant.repository';
import { MessageSetRepository } from '../schedule-messages/repository/message-set.repository';
import { EsSearchModule } from '../es-search/es-search.module';
import { GroupMessagesModule } from '../group-message/group-messages.module';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    forwardRef(() => EsSearchModule),
    TypeOrmModule.forFeature([
      //* for current scope
      CompanyUserRepository,
      SignatureRepository,
      MessageSetRepository,
      MessageRepository,
      ConversationRepository,
      CustomerRepository,
      CompanyRepository,
      CompanyCustomerRepository,
      CompanyUserRepository,
      AttachmentRepository,
      SignatureRepository,
      ParticipantRepository,
    ]),
    CustomersModule,
    UsersModule,
    forwardRef(() => AmqpModule),
    AwsS3Module,
    ParticipantsModule,
    CompanyCustomersModule,
    CompanyUsersModule,
    ParticipantsModule,
    NotificationsModule,
    GroupMessagesModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
