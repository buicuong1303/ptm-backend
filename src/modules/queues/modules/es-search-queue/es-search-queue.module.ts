import { EsSearchQueueConsumer } from './es-search-queue.consumer';
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';
import { EsSearchQueueProducer } from './es-search-queue.producer';
import { EsSearchQueueService } from './es-search-queue.service';
import { EsSearchModule } from 'src/modules/es-search/es-search.module';

@Module({
  imports: [
    forwardRef(() => EsSearchModule),
    BullModule.registerQueue({
      name: 'es-search-queue',
    }),
  ],
  providers: [
    EsSearchQueueProducer,
    EsSearchQueueConsumer,
    EsSearchQueueService,
  ],
  exports: [EsSearchQueueService, BullModule],
})
export class EsSearchQueueModule {}
