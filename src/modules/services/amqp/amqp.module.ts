/* eslint-disable @typescript-eslint/no-var-requires */
import { AmqpConsumer } from './amqp.consumer';
import { AmqpProducer } from './amqp.producer';
import { Module, forwardRef } from '@nestjs/common';
import { RealtimeService } from './services/realtime.service';
import { RingcentralService } from './services/ringcentral.service';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MessagesModule } from 'src/modules/messages/messages.module';
import { CompaniesModule } from 'src/modules/companies/companies.module';
import { ParticipantsModule } from 'src/modules/participants/participants.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsModule } from 'src/modules/conversations/conversations.module';
import { UsersModule } from 'src/modules/users/users.module';
import { WorkerService } from './services/woker.service';
import { ScheduleMessagesModule } from 'src/modules/schedule-messages/schedule-messages.module';
import { rabbitMqConfigAsync } from 'src/common/config/rabbitmq.config';
import { MessageRepository } from 'src/modules/messages/repository/message.repository';
import { AnalyzerService } from './services/analyzer.service';
import { OptSuggestionsModule } from 'src/modules/opt-suggestions/opt-suggestions.module';
import { SensitiveDetectsModule } from 'src/modules/sensitive-detects/sensitive-detects.module';
import { SensitivesModule } from 'src/modules/sensitives/sensitives.module';
require('dotenv').config();
@Module({
  imports: [
    TypeOrmModule.forFeature([
      //* for current scope
      MessageRepository,
    ]),
    RabbitMQModule.forRootAsync(RabbitMQModule, rabbitMqConfigAsync),
    forwardRef(() => MessagesModule),
    forwardRef(() => ConversationsModule),
    ScheduleMessagesModule,
    ParticipantsModule,
    OptSuggestionsModule,
    UsersModule,
    SensitiveDetectsModule,
    forwardRef(() => CompaniesModule),
    forwardRef(() => SensitivesModule),
  ],
  providers: [
    AmqpProducer,
    AmqpConsumer,
    RealtimeService,
    RingcentralService,
    WorkerService,
    AnalyzerService,
  ],
  exports: [
    RealtimeService,
    RingcentralService,
    AmqpProducer,
    AnalyzerService,
    WorkerService,
  ],
  // exports: [RealtimeService, RingcentralService, WorkerService, AmqpProducer],
})
export class AmqpModule {}
