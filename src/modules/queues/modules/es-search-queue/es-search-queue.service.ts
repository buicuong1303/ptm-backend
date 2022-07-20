import { EsSearchQueueProducer } from './es-search-queue.producer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EsSearchQueueService {
  constructor(private readonly esSearchProducer: EsSearchQueueProducer) {}

  //* Message but change to any to ignore build failed
  async insertMessageDocument(message: any) {
    return this.esSearchProducer.insertMessageDocument(message);
  }

  //* Message but change to any to ignore build failed
  async updateMessageDocument(message: any) {
    return this.esSearchProducer.updateMessageDocument(message);
  }
}
