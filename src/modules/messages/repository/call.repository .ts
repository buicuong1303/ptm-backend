import { Repository, EntityRepository } from 'typeorm';
import { Call } from '../entity/call.entity';

@EntityRepository(Call)
export class CallRepository extends Repository<Call> {}
