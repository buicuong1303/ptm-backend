import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus } from 'src/common/constant/entity-status';
import { EntityManager, Not } from 'typeorm';
import { Campaign } from '../campaigns/entity/campaigns.entity';
import { CampaignsRepository } from '../campaigns/repository/campaigns.repository';
import { Customer } from '../customers/entity/customer.entity';
import { User } from '../users/entity/user.entity';
import { CreateCampaignCustomerDto } from './dto/create-campaign-customer.dto';
import { UpdateCampaignCustomerDto } from './dto/update-campaign-customer.dto';
import { CustomerCampaign } from './entity/customer-campaigns.entity';
import { CustomerCampaignRepository } from './repository/campaign-customer.repository';

@Injectable()
export class CustomerCampaignsService {
  constructor(
    private readonly campaignRepository: CampaignsRepository,
    private readonly customerCampaignRepository: CustomerCampaignRepository,
  ) {}

  async updateCustomerCampaigns(
    customer: Customer,
    campaigns: Array<any>,
    user: User,
    manager: EntityManager,
  ) {
    const newCampaigns = [];
    const oldCampaigns = [];
    const newCampaignsAfterCreated = [];

    campaigns.forEach((item) => {
      if (item.id === undefined) newCampaigns.push(item);
      else oldCampaigns.push(item);
    });

    const removeCampaigns = customer.campaignsOfCustomer.filter(
      (currentCompany) =>
        oldCampaigns.findIndex((item) => item.id === currentCompany.id) === -1,
    );

    try {
      if (newCampaigns.length > 0) {
        const assignLabelToCompanyPromise = newCampaigns.map(async (item) => {
          const infoCampaign = await this.campaignRepository.findOne(
            item.value,
          );
          if (!infoCampaign)
            throw new NotFoundException('Company is not exist');
          const newCustomerCampaign = new CustomerCampaign();
          newCustomerCampaign.campaign = infoCampaign;
          newCustomerCampaign.customer = customer;
          return manager.save(newCustomerCampaign);
        });
        newCampaignsAfterCreated.push(
          ...(await Promise.all(assignLabelToCompanyPromise)),
        );
      }

      if (removeCampaigns.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(CustomerCampaign)
          .where('id IN (:...ids)', {
            ids: removeCampaigns.map((item) => item.id),
          })
          .execute();
      }

      return newCampaignsAfterCreated;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async createCustomerCampaign(
    customer: any,
    campaignCustomer: CreateCampaignCustomerDto,
    manager: EntityManager,
    user = null,
  ): Promise<any> {
    const { status, value } = campaignCustomer;
    const campaign = await manager
      .createQueryBuilder(Campaign, 'campaign')
      .where('campaign.id = :campaignId', { campaignId: value })
      .andWhere('campaign.status != :status', { status: EntityStatus.DELETE })
      .getOne();

    if (!campaign) throw new NotFoundException('Not found campaign');

    try {
      const newCampaignCustomer = new CustomerCampaign();
      newCampaignCustomer.customer = customer;
      newCampaignCustomer.campaign = campaign;
      newCampaignCustomer.status = status;
      newCampaignCustomer.creationUserId = user ? user.id : '';
      await manager.save(newCampaignCustomer);

      return newCampaignCustomer;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updateCustomerCampaign(
    customerId: string,
    campaignCustomer: UpdateCampaignCustomerDto,
    manager: EntityManager,
    user = null,
  ): Promise<any> {
    const { status, value } = campaignCustomer;

    const infoCampaignCustomer = await this.customerCampaignRepository.findOne({
      relations: ['campaign'],
      where: {
        customer: customerId,
        campaign: value,
      },
    });
    if (!infoCampaignCustomer)
      throw new NotFoundException('Not found campaign customer');

    try {
      infoCampaignCustomer.status = status;
      infoCampaignCustomer.lastModifiedUserId = user ? user.id : '';
      await manager.save(infoCampaignCustomer);

      return infoCampaignCustomer;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async deleteCustomerCampaign(
    customerId: string,
    campaignId: string,
    manager: EntityManager,
  ): Promise<any> {
    try {
      await manager
        .createQueryBuilder()
        .delete()
        .from(CustomerCampaign)
        .where('customerId = :customerId', {
          customerId: customerId,
        })
        .andWhere('campaignId = :campaignId', {
          campaignId: campaignId,
        })
        .execute();

      return null;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getCampaignsOfCustomer(customerId: string) {
    return await this.customerCampaignRepository.find({
      select: ['id', 'status', 'campaign'],
      where: {
        customer: customerId,
        status: Not(EntityStatus.DELETE),
      },
      relations: ['campaign'],
    });
  }

  async splitCreateOrUpdateCampaignCustomer(
    customerId: string,
    campaignCustomers: Array<any>,
  ) {
    const campaignCustomersNeedCreate = [];
    const campaignCustomersNeedDelete = [];
    const campaignCustomersNeedUpdate = [];
    try {
      for (let i = 0; i < campaignCustomers.length; i++) {
        if (campaignCustomers[i].status !== EntityStatus.ACTIVE) {
          campaignCustomersNeedDelete.push({
            value: campaignCustomers[i].value, //* value === id
            status: EntityStatus.DELETE,
          });
        } else {
          const oldCampaignCustomer =
            await this.customerCampaignRepository.findOne({
              where: {
                customer: customerId,
                campaign: campaignCustomers[i].value, //* value === id
                status: EntityStatus.ACTIVE,
              },
            });
          if (!oldCampaignCustomer)
            campaignCustomersNeedCreate.push({
              value: campaignCustomers[i].value, //* value === id
              status: EntityStatus.ACTIVE,
            });
          else
            campaignCustomersNeedUpdate.push({
              value: campaignCustomers[i].value, //* value === id
              status: EntityStatus.ACTIVE,
            });
        }
      }
    } catch (error) {
      throw new InternalServerErrorException();
    }
    return [
      campaignCustomersNeedCreate,
      campaignCustomersNeedDelete,
      campaignCustomersNeedUpdate,
    ];
  }
}
