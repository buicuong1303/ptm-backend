import { Repository, EntityRepository } from 'typeorm';
import { NotificationReceiver } from '../entity/notification-receiver.entity';

@EntityRepository(NotificationReceiver)
export class NotificationReceiverRepository extends Repository<NotificationReceiver> {}
