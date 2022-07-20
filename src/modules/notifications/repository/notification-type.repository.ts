import { Repository, EntityRepository } from 'typeorm';
import { NotificationType } from '../entity/notification-type.entity';

@EntityRepository(NotificationType)
export class NotificationTypeRepository extends Repository<NotificationType> {}
