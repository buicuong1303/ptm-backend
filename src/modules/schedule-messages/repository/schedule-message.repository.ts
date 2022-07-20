import { Repository, EntityRepository } from 'typeorm';
import { ScheduleMessage } from '../entity/schedule-message.entity';

@EntityRepository(ScheduleMessage)
export class ScheduleMessageRepository extends Repository<ScheduleMessage> {}
