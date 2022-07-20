import { Repository, EntityRepository } from 'typeorm';
import { Campaign } from '../entity/campaigns.entity';

@EntityRepository(Campaign)
export class CampaignsRepository extends Repository<Campaign> {}
