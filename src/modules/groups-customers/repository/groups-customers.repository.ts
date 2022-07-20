import { Repository, EntityRepository } from 'typeorm';
import { GroupCustomer } from '../entity/groups-customers.entity';

@EntityRepository(GroupCustomer)
export class GroupCustomerRepository extends Repository<GroupCustomer> {}
