import { Repository, EntityRepository } from 'typeorm';
import { GroupMessage } from '../entity/group-message.entity';

@EntityRepository(GroupMessage)
export class GroupMessageRepository extends Repository<GroupMessage> {}
