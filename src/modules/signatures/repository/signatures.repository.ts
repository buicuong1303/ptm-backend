import { Repository, EntityRepository } from 'typeorm';
import { Signature } from '../entity/signature.entity';

@EntityRepository(Signature)
export class SignatureRepository extends Repository<Signature> {}
