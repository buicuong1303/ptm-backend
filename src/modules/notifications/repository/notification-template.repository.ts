import { Repository, EntityRepository } from 'typeorm';
import { NotificationTemplate } from '../entity/notification-template.entity';

@EntityRepository(NotificationTemplate)
export class NotificationTemplateRepository extends Repository<NotificationTemplate> {}
