import {
  Connection,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Conversation } from '../entity/conversation.entity';

@Injectable()
export class ConversationSubscriber implements EntitySubscriberInterface<any> {
  constructor(@InjectConnection() readonly _connection: Connection) {
    _connection.subscribers.push(this);
  }

  public listenTo(): any {
    return Conversation;
  }

  public async afterUpdate(event: UpdateEvent<Conversation>): Promise<any> {
    const { updatedColumns, updatedRelations } = event;

    const indexAnotherProperty = updatedColumns?.findIndex(
      (item) =>
        item.propertyName !== 'isCompleted' &&
        item.propertyName !== 'newOrExisting' &&
        item.propertyName !== 'labels' &&
        item.propertyName !== 'lastModifiedUserId' &&
        item.propertyName !== 'lastModifiedTime',
    );

    if (indexAnotherProperty !== -1 || updatedRelations?.length > 0) {
      event.entity.lastModifiedTime = new Date();
      await event.manager.save(event.entity);
    }
    return;
  }

  public async afterInsert(event: InsertEvent<Conversation>): Promise<any> {
    event.entity.lastModifiedTime = new Date();
    await event.manager.save(event.entity);
    return;
  }
}
