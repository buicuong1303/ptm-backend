import { Repository, EntityRepository } from 'typeorm';
import { MessageSet } from '../entity/message-set.entity';

@EntityRepository(MessageSet)
export class MessageSetRepository extends Repository<MessageSet> {}
