import {
  Connection,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Message } from 'src/modules/messages/entity/message.entity';
import { InjectConnection } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { EsSearchQueueService } from 'src/modules/queues/modules/es-search-queue/es-search-queue.service';
import { ProfanityQueueService } from 'src/modules/queues/modules/profanity-queue/profanity-queue.service';

@Injectable()
export class MessageSubscriber implements EntitySubscriberInterface<any> {
  constructor(
    @InjectConnection() readonly _connection: Connection,

    private readonly _esSearchQueueService: EsSearchQueueService,
    private readonly _profanityQueueService: ProfanityQueueService,
  ) {
    _connection.subscribers.push(this);
  }

  public listenTo(): any {
    return Message;
  }

  public async afterInsert(event: InsertEvent<Message>): Promise<any> {
    this._esSearchQueueService.insertMessageDocument(event.entity);
    this._profanityQueueService.detectProfanity(event.entity);
    return;
  }

  public async afterUpdate(event: UpdateEvent<Message>): Promise<any> {
    this._esSearchQueueService.updateMessageDocument(event.entity);
    return;
  }

  // Don't using before remove because all entity just using soft delete
}
