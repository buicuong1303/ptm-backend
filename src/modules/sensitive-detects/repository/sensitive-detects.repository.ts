import { Repository, EntityRepository } from 'typeorm';
import { SensitiveDetect } from '../entity/sensitive-detects.entity';

@EntityRepository(SensitiveDetect)
export class SensitiveDetectsRepository extends Repository<SensitiveDetect> {}
