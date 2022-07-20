import { forwardRef, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTypeRepository } from './repository/notification-type.repository';
import { MessageRepository } from '../messages/repository/message.repository';
import { NotificationTemplateRepository } from './repository/notification-template.repository';
import { UserRepository } from '../users/repository/user.repository';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { AmqpModule } from '../services/amqp/amqp.module';
import { NotificationReceiverRepository } from './repository/notification-receiver.repository';
import { NotificationCreatorRepository } from './repository/notification-creator.repository';
import { CompanyUserRepository } from '../company-users/repository/company-user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      //* for current scope
      NotificationTypeRepository,
      MessageRepository,
      NotificationTemplateRepository,
      CompanyUserRepository,
      CustomerRepository,
      UserRepository,
      NotificationReceiverRepository,
      NotificationCreatorRepository,
    ]),
    forwardRef(() => AmqpModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
