import { forwardRef, Module } from '@nestjs/common';
import { LogActivityQueueModule } from './modules/log-activity-queue/log-activity-queue.module';
import { EmailQueueModule } from './modules/email-queue/email-queue.module';
import { EsSearchQueueModule } from './modules/es-search-queue/es-search-queue.module';
import { ProfanityQueueModule } from './modules/profanity-queue/profanity-queue.module';
import { QueuesController } from './queues.controller';
import { QueuesProvider } from './queues.provider';

@Module({
  imports: [
    LogActivityQueueModule,
    EmailQueueModule,
    EsSearchQueueModule,
    ProfanityQueueModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesProvider],
})
export class QueuesModule {}
