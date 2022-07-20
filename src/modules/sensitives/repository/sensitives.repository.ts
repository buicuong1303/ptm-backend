import { Repository, EntityRepository } from 'typeorm';
import { Sensitive } from '../entity/sensitives.entity';

@EntityRepository(Sensitive)
export class SensitivesRepository extends Repository<Sensitive> {}
