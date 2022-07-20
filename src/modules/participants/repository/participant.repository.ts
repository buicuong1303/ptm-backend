import { Repository, EntityRepository } from 'typeorm';
import { Participant } from '../entity/participant.entity';

@EntityRepository(Participant)
export class ParticipantRepository extends Repository<Participant> {}
