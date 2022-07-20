import { Repository, EntityRepository } from 'typeorm';
import { CustomerCampaign } from '../entity/customer-campaigns.entity';

@EntityRepository(CustomerCampaign)
export class CustomerCampaignRepository extends Repository<CustomerCampaign> {}
