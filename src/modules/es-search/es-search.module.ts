import { forwardRef, Module } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { EsSearchController } from './es-search.controller';
import { EsSearchService } from './es-search.service';
import { MessageEsIndex } from './es-index/message.es.index';
import { Message } from '../messages/entity/message.entity';
import { MessageSubscriber } from './entity-subscribers/message.subscriber';
import { EsSearchServiceInterface } from './interface/es-search.service.interface';
import { MessageRepository } from '../messages/repository/message.repository';
import { EsSearchQueueModule } from '../queues/modules/es-search-queue/es-search-queue.module';
import { ProfanityQueueModule } from '../queues/modules/profanity-queue/profanity-queue.module';

@Module({
  imports: [
    forwardRef(() => EsSearchQueueModule),
    forwardRef(() => ProfanityQueueModule),
    ElasticsearchModule.register({
      node: `${process.env.ES_HOST}:${process.env.ES_PORT}`,
      requestTimeout: +process.env.ES_REQUEST_TIMEOUT,
    }),

    TypeOrmModule.forFeature([Message, MessageRepository]),
  ],
  controllers: [EsSearchController],
  providers: [
    {
      provide: 'EsSearchService',
      useClass: EsSearchService,
    },
    MessageSubscriber,
    MessageEsIndex,
  ],
  exports: [EsSearchService, MessageEsIndex],
})
export class EsSearchModule implements OnModuleInit {
  constructor(
    @Inject('EsSearchService')
    private readonly _esSearchService: EsSearchServiceInterface<any>,
  ) {}
  public async onModuleInit() {
    console.log('OnModuleInit Start indexing...');
    await this._esSearchService.insertIndex();
  }
}
