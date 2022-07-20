import { LogActivity } from '../entity/log-activities.entity';
import { Repository, EntityRepository } from 'typeorm';

@EntityRepository(LogActivity)
export class LogActivityRepository extends Repository<LogActivity> {}
