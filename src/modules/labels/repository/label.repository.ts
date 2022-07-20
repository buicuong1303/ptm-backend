import { Repository, EntityRepository } from 'typeorm';
import { Label } from '../entity/label.entity';

@EntityRepository(Label)
export class LabelRepository extends Repository<Label> {}
