import { LogActivityQueueConsumer } from './log-activity-queue.consumer';
import { BullModule } from '@nestjs/bull';
import { Module, Global } from '@nestjs/common';
import { LogActivityQueueService } from './log-activity-queue.service';
import { LogActivityQueueProducer } from './log-activity-queue.producer';
import { LogActivitiesModule } from 'src/modules/log-activities/log-activities.module';
@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'log-activity-queue',
    }),
    LogActivitiesModule,
  ],
  providers: [
    LogActivityQueueProducer,
    LogActivityQueueConsumer,
    LogActivityQueueService,
  ],
  exports: [LogActivityQueueService, BullModule],
})
export class LogActivityQueueModule {}
