import { Repository, EntityRepository } from 'typeorm';
import { NotificationCreator } from '../entity/notification-creator.entity';

@EntityRepository(NotificationCreator)
export class NotificationCreatorRepository extends Repository<NotificationCreator> {}
