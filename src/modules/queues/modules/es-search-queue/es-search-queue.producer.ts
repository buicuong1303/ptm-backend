import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Message } from 'src/modules/messages/entity/message.entity';

@Injectable()
export class EsSearchQueueProducer {
  constructor(
    @InjectQueue('es-search-queue')
    private readonly esSearchQueue: Queue,
  ) {}

  async insertMessageDocument(message: Message) {
    const jobInsert = await this.esSearchQueue.add(
      'insert-message-document',
      {
        message,
      },
      {
        attempts: 5,
        backoff: 5000,
        delay: 10000,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );

    return jobInsert;
  }

  async updateMessageDocument(message: Message) {
    const jobUpdate = await this.esSearchQueue.add(
      'update-message-document',
      {
        message,
      },
      {
        attempts: 5,
        backoff: 5000,
        delay: 10000,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );

    return jobUpdate;
  }
}
