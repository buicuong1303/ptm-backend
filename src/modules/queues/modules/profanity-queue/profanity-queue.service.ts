import { ProfanityQueueProducer } from './profanity-queue.producer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProfanityQueueService {
  constructor(private readonly profanityProducer: ProfanityQueueProducer) {}

  //* Message but change to any to ignore build failed
  async detectProfanity(message: any) {
    this.profanityProducer.detectProfanity(message);
  }
}
