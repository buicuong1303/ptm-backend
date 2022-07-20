import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Message } from 'src/modules/messages/entity/message.entity';

@Injectable()
export class ProfanityQueueProducer {
  constructor(
    @InjectQueue('profanity-queue')
    private readonly profanityQueue: Queue,
  ) {}

  async detectProfanity(message: Message) {
    const jobInsert = await this.profanityQueue.add(
      'detect-profanity',
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
}
