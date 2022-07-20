import { Repository, EntityRepository } from 'typeorm';
import { Message } from '../entity/message.entity';

@EntityRepository(Message)
export class MessageRepository extends Repository<Message> {}
