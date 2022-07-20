import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { GroupCustomerRepository } from './repository/groups-customers.repository';

@Injectable()
export class GroupCustomersService {
  constructor(
    @InjectRepository(GroupCustomerRepository)
    private readonly groupCustomerRepository: GroupCustomerRepository,
  ) {}

  async changeStatusGroupCustomer(data: any, user = null) {
    const groupCustomer = await this.groupCustomerRepository.findOne({
      where: {
        customer: { id: data.customerId },
        group: { id: data.groupId },
      },
    });
    if (!groupCustomer)
      throw new NotFoundException('Not found customer in group');

    try {
      if (groupCustomer.status === EntityStatus.ACTIVE) {
        groupCustomer.status = EntityStatus.INACTIVE;
        groupCustomer.lastModifiedUserId = user ? user.id : '';
        await groupCustomer.save();

        return {
          customerId: data.customerId,
          groupCustomerStatus: groupCustomer.status,
        };
      }

      if (groupCustomer.status === EntityStatus.INACTIVE) {
        groupCustomer.status = EntityStatus.ACTIVE;
        groupCustomer.lastModifiedUserId = user ? user.id : '';
        await groupCustomer.save();

        return {
          customerId: data.customerId,
          groupCustomerStatus: groupCustomer.status,
        };
      }
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
