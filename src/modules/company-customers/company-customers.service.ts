import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { EntityManager, getManager, Not } from 'typeorm';
import { Company } from '../companies/entity/company.entity';
import { CompanyRepository } from '../companies/repository/company.repository';
import { Conversation } from '../conversations/entity/conversation.entity';
import { ConversationRepository } from '../conversations/repository/conversation.repository';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { CreateCompanyCustomerDto } from './dto/create-company-customer.dto';
import { CompanyCustomer } from './entity/company-customer.entity';
import { CompanyCustomerRepository } from './repository/company-customer.repository';

@Injectable()
export class CompanyCustomersService {
  constructor(
    @InjectRepository(CompanyCustomerRepository)
    private readonly companyCustomerRepository: CompanyCustomerRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async getCompaniesOfCustomer(customerId: string) {
    return await this.companyCustomerRepository.find({
      select: ['id', 'status', 'company'],
      where: {
        customer: customerId,
        status: Not(EntityStatus.DELETE),
      },
      relations: ['company'],
    });
  }

  async getCompanyOfCustomerByPhone(phoneFrom: string, phoneTo: string) {
    const customer = await this.customerRepository.findOne({
      where: {
        phoneNumber: phoneFrom,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!customer) throw new NotFoundException('Not found customer');

    const company = await this.companyRepository.findOne({
      where: {
        phone: phoneTo,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!company) throw new NotFoundException('Not found company');

    const companyOfCustomer = await this.companyCustomerRepository.findOne({
      where: {
        customer: customer,
        company: company,
      },
    });
    if (!companyOfCustomer)
      throw new NotFoundException('Not found company customer');

    const conversation = await this.conversationRepository.findOne({
      where: {
        id: companyOfCustomer.conversation.id,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!conversation)
      throw new NotFoundException('Not found conversation company');

    return { conversation: conversation, company: company };
  }

  async getCustomerByConversationId(conversationId: string) {
    const companyCustomer = await getManager()
      .createQueryBuilder(CompanyCustomer, 'companyCustomer')
      .addSelect(['companiesOfCustomer.id', 'company.id', 'company.name'])
      .innerJoinAndSelect('companyCustomer.customer', 'customer')
      .innerJoin('customer.companiesOfCustomer', 'companiesOfCustomer')
      .innerJoin('companiesOfCustomer.company', 'company')
      .innerJoin('companyCustomer.conversation', 'conversation')
      .leftJoinAndSelect('customer.campaignsOfCustomer', 'campaignsOfCustomer')
      .leftJoinAndSelect('campaignsOfCustomer.campaign', 'campaign')
      .andWhere(
        'conversation.id = :conversationId and conversation.status = :status',
        {
          conversationId,
          status: EntityStatus.ACTIVE,
        },
      )
      .getOne();
    const data = {
      ...companyCustomer.customer,
      companies: companyCustomer.customer.companiesOfCustomer.map(
        (cpn) => cpn.company.name,
      ),
      campaigns: companyCustomer.customer
        ? companyCustomer.customer.campaignsOfCustomer.map(
            (campaignCustomer) => ({
              label: campaignCustomer.campaign.name,
              value: campaignCustomer.campaign.id,
              id: campaignCustomer.id,
              status: campaignCustomer.status,
            }),
          )
        : [],
    };
    delete data['companiesOfCustomer'];
    delete data['campaignsOfCustomer'];

    return data;
  }

  async createCompanyCustomer(
    customer: any,
    companyCustomer: CreateCompanyCustomerDto,
    conversation: Conversation,
    manager: EntityManager,
    user = null,
  ): Promise<any> {
    const { status, companyId } = companyCustomer;
    const company = await manager
      .createQueryBuilder(Company, 'company')
      .where('company.id = :companyId', { companyId })
      .andWhere('company.status != :status', { status: EntityStatus.DELETE })
      .getOne();

    // const company = await this.companyRepository.findOne({
    //   where: {
    //     id: companyId,
    //     status: Not(EntityStatus.DELETE),
    //   },
    // });
    if (!company) throw new NotFoundException('Not found company');

    try {
      const newCompanyCustomer = new CompanyCustomer();
      newCompanyCustomer.customer = customer;
      newCompanyCustomer.company = company;
      newCompanyCustomer.status = status;
      newCompanyCustomer.conversation = conversation;
      newCompanyCustomer.creationUserId = user ? user.id : '';
      await manager.save(newCompanyCustomer);

      return newCompanyCustomer;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updateCompanyCustomer(
    customerId: string,
    companyCustomer: CreateCompanyCustomerDto,
    manager: EntityManager,
    user = null,
  ): Promise<any> {
    const { status, companyId } = companyCustomer;

    const infoCompanyCustomer = await this.companyCustomerRepository.findOne({
      relations: ['company'],
      where: {
        customer: customerId,
        company: companyId,
      },
    });
    if (!infoCompanyCustomer)
      throw new NotFoundException('Not found company customer');

    try {
      infoCompanyCustomer.status = status;
      infoCompanyCustomer.lastModifiedUserId = user ? user.id : '';
      await manager.save(infoCompanyCustomer);

      return infoCompanyCustomer;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async splitCreateOrUpdateCompanyCustomer(
    customerId: string,
    companyCustomers: Array<any>,
  ) {
    const companyCustomerNeedCreate = [];
    const companyCustomerNeedUpdate = [];
    try {
      for (let i = 0; i < companyCustomers.length; i++) {
        const oldCompanyCustomer = await this.companyCustomerRepository.findOne(
          {
            where: {
              customer: customerId,
              company: companyCustomers[i].companyId,
              status: Not(EntityStatus.DELETE),
            },
          },
        );

        if (oldCompanyCustomer) {
          companyCustomerNeedUpdate.push({
            companyId: companyCustomers[i].companyId,
            status: companyCustomers[i].status,
          });
        } else {
          companyCustomerNeedCreate.push({
            companyId: companyCustomers[i].companyId,
            status: companyCustomers[i].status,
          });
        }
      }
    } catch (error) {
      throw new InternalServerErrorException();
    }
    return [companyCustomerNeedCreate, companyCustomerNeedUpdate];
  }

  findOne(id: number) {
    return `This action returns a #${id} companyCustomer`;
  }

  remove(id: number) {
    return `This action removes a #${id} companyCustomer`;
  }
}
