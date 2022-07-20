import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerRepository } from './repository/customer.repository';
import { AddCustomerDto } from './dto/add-customer.dto';
import { Customer } from './entity/customer.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EntityStatus } from 'src/common/constant/entity-status';
import { EntityManager, getManager, Not, Raw } from 'typeorm';
import { CompanyCustomersService } from '../company-customers/company-customers.service';
import { CreateCompanyCustomerDto } from '../company-customers/dto/create-company-customer.dto';
import { Conversation } from '../conversations/entity/conversation.entity';
import { CompanyUsersService } from '../company-users/company-users.service';
import { ParticipantsService } from '../participants/participants.service';
import { Participant } from '../participants/entity/participant.entity';
import { GroupRepository } from '../groups/repository/group.repository';
import { GroupCustomer } from '../groups-customers/entity/groups-customers.entity';
import { GroupCustomerRepository } from '../groups-customers/repository/groups-customers.repository';
import { transformSearchPhoneNumber } from 'src/common/utils/transformSearchPhoneNumber';
import { transformSavePhoneNumber } from 'src/common/utils/transformSavePhoneNumber';
import { EditCustomerDto } from './dto/edit-customer.dto';
import { CompanyCustomer } from '../company-customers/entity/company-customer.entity';
import { MessageDirection } from 'src/common/constant/message-direction';
import * as XLSX from 'xlsx';
import { CustomerCampaignsService } from '../customer-campaigns/customer-campaigns.service';
import { Campaign } from '../campaigns/entity/campaigns.entity';
import { Company } from '../companies/entity/company.entity';
import { CustomerCampaign } from '../customer-campaigns/entity/customer-campaigns.entity';
import { CreateCampaignCustomerDto } from '../customer-campaigns/dto/create-campaign-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerRepository)
    private customerRepository: CustomerRepository,
    private groupCustomerRepository: GroupCustomerRepository,
    private groupRepository: GroupRepository,
    private readonly companyCustomersService: CompanyCustomersService,
    private readonly companyUsersService: CompanyUsersService,
    private readonly participantsService: ParticipantsService,
    private readonly customerCampaignService: CustomerCampaignsService,
  ) {}

  async createCustomer(
    addCustomerDto: AddCustomerDto,
    manager: EntityManager,
    umn = 0,
    createWithUi = false,
    user = null,
    direction: any,
  ): Promise<any> {
    const {
      fullName,
      emailAddress,
      phoneNumber,
      status,
      companyCustomers,
      campaignCustomers = [],
    } = addCustomerDto;

    //* check phone
    const isExistPhoneNumber = await manager
      .createQueryBuilder(Customer, 'customer')
      .where('customer.phoneNumber = :phoneNumber', { phoneNumber })
      .andWhere('customer.status != :status', { status: EntityStatus.DELETE })
      .getOne();
    if (isExistPhoneNumber)
      throw new ConflictException('Phone number early exist');
    //* check email
    if (emailAddress) {
      const isExistEmail = await this.customerRepository.findOne({
        where: {
          emailAddress: Raw(
            (emailAddress) =>
              `UPPER(${emailAddress}) = '${addCustomerDto.emailAddress.toUpperCase()}'`,
          ),
          status: Not(EntityStatus.DELETE),
        },
      });
      if (isExistEmail)
        throw new ConflictException('Email address early exist');
    }
    try {
      //* create new customer
      const newCustomer: Customer = new Customer();
      newCustomer.fullName = fullName;
      newCustomer.emailAddress = emailAddress;
      newCustomer.phoneNumber = transformSavePhoneNumber(phoneNumber);
      newCustomer.status = status;
      newCustomer.creationUserId = user ? user.id : '';
      const createdCustomer = await manager.save(newCustomer);

      // * add customer to companies
      const addCustomerToCompanies = companyCustomers.map(
        async (companyCustomer) => {
          return this.addCustomerToCompany(
            createdCustomer,
            companyCustomer,
            manager,
            umn,
            user,
            direction,
          );
        },
      );
      //* data return from create customer according to Erik's logic
      const customerToCompanies = await Promise.all(addCustomerToCompanies);
      // * add customer to campaigns
      const addCustomerToCampaigns = campaignCustomers.map(
        async (campaignCustomer) => {
          if (campaignCustomer.status !== EntityStatus.ACTIVE) return null;
          return await this.addCustomerToCampaign(
            createdCustomer,
            campaignCustomer,
            manager,
            user,
          );
        },
      );
      const customerToCampaigns = await Promise.all(addCustomerToCampaigns);
      //* data return from create customer with UI
      const mixData = {
        ...newCustomer,
        customer: newCustomer,
        companyCustomers: customerToCompanies.map((item) => {
          return {
            id: item.companyCustomer.id,
            status: item.companyCustomer.status,
            company: item.companyCustomer.company,
            ...item,
          };
        }),
        campaignCustomers: customerToCampaigns.filter((item) => item),
      };
      return createWithUi ? mixData : customerToCompanies;
    } catch (error) {
      throw new InternalServerErrorException('Create customer error');
    }
  }

  async addCustomerToCompany(
    customer: Customer,
    companyCustomer: CreateCompanyCustomerDto,
    manager: EntityManager,
    umn: any,
    user = null,
    direction,
  ) {
    try {
      const customersCompany = await manager
        .createQueryBuilder(CompanyCustomer, 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .innerJoinAndSelect('companyCustomer.conversation', 'conversation')
        .where('customer.id = :customerId', { customerId: customer.id })
        .andWhere('company.id = :companyId', {
          companyId: companyCustomer.companyId,
        })
        .getOne();
      if (!customersCompany) {
        let participants: Array<Participant> = [];
        //* create new conversation
        const newConversation = new Conversation();
        if (direction === MessageDirection.INBOUND) {
          newConversation.isCompleted = false;
        } else {
          newConversation.isCompleted = true;
        }
        const infoConversation = await manager.save(newConversation);
        //* create company customer
        const createdCompanyCustomer =
          await this.companyCustomersService.createCompanyCustomer(
            customer,
            companyCustomer,
            infoConversation,
            manager,
            user,
          );
        //* create participants
        const usersInCompany = await this.companyUsersService.getUserInCompany(
          companyCustomer.companyId,
        );

        if (usersInCompany && usersInCompany.length > 0) {
          const createParticipants = usersInCompany.map(
            async (userInCompany) => {
              let temp = umn;
              if (user && userInCompany.user.id === user.id) temp = 0;
              const createdParticipant =
                await this.participantsService.addUserIntoConversation(
                  infoConversation,
                  userInCompany,
                  manager,
                  temp,
                );
              return manager.save(createdParticipant);
            },
          );
          participants = await Promise.all(createParticipants);
        }
        return {
          companyCustomer: createdCompanyCustomer,
          participants: participants.filter(
            (item) => item.companyUser.status === EntityStatus.ACTIVE,
          ),
        };
      } else {
        customersCompany.status = EntityStatus.ACTIVE;
        await manager.save(customersCompany);
        //* create participants
        const usersInCompany = await this.companyUsersService.getUserInCompany(
          companyCustomer.companyId,
        );
        let participants: Array<Participant> = [];
        if (usersInCompany && usersInCompany.length > 0) {
          const createParticipants = usersInCompany.map(
            async (userInCompany) => {
              let temp = umn;
              if (user && userInCompany.user.id === user.id) temp = 0;
              const participant = await manager
                .createQueryBuilder(Participant, 'participant')
                .innerJoinAndSelect('participant.conversation', 'conversation')
                .innerJoinAndSelect('participant.companyUser', 'companyUser')
                .where('conversation.id = :conversationId', {
                  conversationId: customersCompany.conversation.id,
                })
                .andWhere('companyUser.id = :companyUserId', {
                  companyUserId: userInCompany.id,
                })
                .andWhere('participant.status = :status', {
                  status: EntityStatus.ACTIVE,
                })
                .getOne();
              participant.umn = temp;
              return manager.save(participant);
            },
          );
          participants = await Promise.all(createParticipants);
        }
        return {
          companyCustomer: customersCompany,
          participants: participants.filter(
            (item) => item.companyUser.status === EntityStatus.ACTIVE,
          ),
        };
      }
    } catch (error) {
      console.log(error);
    }
  }

  async updateCustomer(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    manager: EntityManager,
    user = null,
  ): Promise<any> {
    const {
      companyCustomers,
      campaignCustomers,
      fullName,
      phoneNumber,
      emailAddress,
      status,
    } = updateCustomerDto;

    const isExistPhoneNumber = await this.customerRepository.findOne({
      where: {
        id: Not(id),
        phoneNumber: transformSavePhoneNumber(phoneNumber),
        status: Not(EntityStatus.DELETE),
      },
    });
    if (isExistPhoneNumber)
      throw new ConflictException('Phone number already exist');

    if (emailAddress) {
      const isExistEmail = await this.customerRepository.findOne({
        where: {
          id: Not(id),
          emailAddress: Raw(
            (emailAddress) =>
              `UPPER(${emailAddress}) = '${emailAddress.toUpperCase()}'`,
          ),
          status: Not(EntityStatus.DELETE),
        },
      });
      if (isExistEmail)
        throw new ConflictException('Email address already exist');
    }

    const customer = await this.customerRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!customer) throw new NotFoundException('Not found Customer');

    customer.emailAddress = emailAddress;
    customer.fullName = fullName;
    // customer.phoneNumber = transformSavePhoneNumber(phoneNumber);
    customer.lastModifiedUserId = user ? user.id : '';
    customer.status = status;

    try {
      const updatedCustomer = await manager.save(customer);

      let createdCompanyCustomers = [];
      let updatedCompanyCustomers = [];

      let createdCampaignCustomers = [];
      let updatedCampaignCustomers = [];

      if (companyCustomers.length > 0) {
        const [companyCustomersNeedCreate, companyCustomersNeedUpdate] =
          await this.companyCustomersService.splitCreateOrUpdateCompanyCustomer(
            updatedCustomer.id,
            companyCustomers,
          );
        if (companyCustomersNeedUpdate.length > 0) {
          const updateCompanyCustomers = companyCustomersNeedUpdate.map(
            (companyCustomer) => {
              return this.companyCustomersService.updateCompanyCustomer(
                customer.id,
                companyCustomer,
                manager,
                user,
              );
            },
          );
          updatedCompanyCustomers = await Promise.all(updateCompanyCustomers);
        }
        if (companyCustomersNeedCreate.length > 0) {
          const addCustomerToCompanies = companyCustomersNeedCreate.map(
            async (companyCustomer) => {
              return this.addCustomerToCompany(
                updatedCustomer,
                companyCustomer,
                manager,
                0,
                user,
                MessageDirection.OUTBOUND,
              );
            },
          );
          createdCompanyCustomers = await Promise.all(addCustomerToCompanies);
        }
      }

      if (campaignCustomers.length > 0) {
        const [
          campaignCustomersNeedCreate,
          campaignCustomersNeedDelete,
          campaignCustomersNeedUpdate,
        ] = await this.customerCampaignService.splitCreateOrUpdateCampaignCustomer(
          updatedCustomer.id,
          campaignCustomers,
        );
        if (campaignCustomersNeedDelete.length > 0) {
          const deleteCampaignCustomers = campaignCustomersNeedDelete.map(
            (campaignCustomer) => {
              return this.customerCampaignService.deleteCustomerCampaign(
                customer.id,
                campaignCustomer.value,
                manager,
              );
            },
          );
          await Promise.all(deleteCampaignCustomers);
        }
        if (campaignCustomersNeedCreate.length > 0) {
          const addCustomerToCampaigns = campaignCustomersNeedCreate.map(
            async (campaignCustomer) => {
              return this.addCustomerToCampaign(
                updatedCustomer,
                campaignCustomer,
                manager,
                user,
              );
            },
          );
          createdCampaignCustomers = await Promise.all(addCustomerToCampaigns);
        }
        if (campaignCustomersNeedUpdate.length > 0) {
          const updateCustomerToCampaigns = campaignCustomersNeedUpdate.map(
            async (campaignCustomer) => {
              return this.customerCampaignService.updateCustomerCampaign(
                customer.id,
                campaignCustomer,
                manager,
                user,
              );
            },
          );
          updatedCampaignCustomers = await Promise.all(
            updateCustomerToCampaigns,
          );
        }
      }

      await manager.queryRunner.commitTransaction();

      const data = {
        ...updatedCustomer,
        companyCustomers: [
          ...createdCompanyCustomers.map((item) => {
            return {
              id: item.companyCustomer.id,
              status: item.companyCustomer.status,
              company: item.companyCustomer.company,
              ...item,
            };
          }),
          ...updatedCompanyCustomers,
        ],
        campaignCustomers: [
          ...createdCampaignCustomers.map((item) => {
            return {
              id: item.id,
              status: item.status,
              campaign: item.campaign,
              ...item,
            };
          }),
          ...updatedCampaignCustomers,
        ],
      };

      return data;
    } catch (error) {
      await manager.queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await manager.queryRunner.release();
    }
  }

  async removeCustomer(id: string, user = null) {
    const customer = await this.customerRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!customer) throw new NotFoundException('Not found Customer');

    customer.status = EntityStatus.DELETE;
    customer.lastModifiedUserId = user.id;
    await customer.save();

    return customer;
  }

  async getCustomers() {
    const customers = await this.customerRepository.find({
      order: {
        fullName: 'DESC',
      },
      where: {
        status: Not(EntityStatus.DELETE),
      },
    });

    return customers;
  }

  async filterCustomers(
    limitItem: any = null,
    currentItem: any = null,
    searchValue: any = '',
  ) {
    let results = [];
    const resultsMix = {
      currentItem: currentItem,
      totalCustomers: 0,
      customers: [],
    };

    const customers = await this.getCustomers();
    if (customers.length <= 0)
      throw new NotFoundException('Not found customers');

    if (!searchValue) results = [...customers];
    else {
      for (let i = 0; i < customers.length; i++) {
        for (const key in customers[i]) {
          if (
            key === 'phoneNumber' &&
            customers[i][key] &&
            customers[i][key]
              .toLowerCase()
              .indexOf(
                transformSearchPhoneNumber(searchValue).toLowerCase() || 'any',
              ) != -1
          ) {
            results.push(customers[i]);
            break;
          }
          if (
            (key === 'fullName' ||
              key === 'emailAddress' ||
              key === 'status') &&
            customers[i][key] &&
            customers[i][key]
              .toLowerCase()
              .indexOf(searchValue.toLowerCase()) != -1
          ) {
            results.push(customers[i]);
            break;
          }
        }
      }
    }

    resultsMix.totalCustomers = results.length;

    const listCustomers = results
      .splice(currentItem, limitItem)
      .map(async (item) => {
        const companies =
          await this.companyCustomersService.getCompaniesOfCustomer(item.id);

        const campaigns =
          await this.customerCampaignService.getCampaignsOfCustomer(item.id);

        return {
          ...item,
          companyCustomers: companies,
          campaignCustomers: campaigns,
        };
      });

    const customersFullInfor = await Promise.all(listCustomers);

    resultsMix.customers = customersFullInfor;

    return resultsMix;
  }

  async getCustomerById(id: string) {
    const customer = await this.customerRepository.findOne({
      relations: ['conversation'],
      where: {
        id: id,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!customer) throw new NotFoundException('Not found customer');

    return customer;
  }

  async getCustomersComposeText(filters: any) {
    const { _page = 1, _search = '', _company = '' } = filters;
    const PAGE_SIZE = 10;

    const countQuery = getManager()
      .createQueryBuilder(Customer, 'customer')
      .innerJoinAndSelect('customer.companiesOfCustomer', 'companyCustomer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .andWhere('customer.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('companyCustomer.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('company.status = :status', {
        status: EntityStatus.ACTIVE,
      });

    const dataQuery = getManager()
      .createQueryBuilder(Customer, 'customer')
      .innerJoinAndSelect('customer.companiesOfCustomer', 'companyCustomer')
      .innerJoinAndSelect('customer.campaignsOfCustomer', 'campaignsOfCustomer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .andWhere('customer.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('companyCustomer.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('company.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .take(PAGE_SIZE)
      .skip((+_page - 1) * PAGE_SIZE);

    if (_search) {
      dataQuery.andWhere('customer.phoneNumber LIKE :phone', {
        phone: `%${_search}%`,
      });
      countQuery.andWhere('customer.phoneNumber LIKE :phone', {
        phone: `%${_search}%`,
      });
    }

    if (_company) {
      dataQuery.andWhere('company.id = :companyId', {
        companyId: _company,
      });
      countQuery.andWhere('company.id = :companyId', {
        companyId: _company,
      });
    }

    const customers = await dataQuery.getMany();
    const length = await countQuery.getCount();

    return {
      data: customers,
      pagination: {
        totalPage: Math.ceil(length / PAGE_SIZE),
        page: +_page,
        limit: PAGE_SIZE,
      },
    };
  }

  async addCustomersToGroup(listPhone: any, groupId: string, user = null) {
    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!group) throw new NotFoundException('Not found group');

    try {
      for (let i = 0; i < listPhone.length; i++) {
        const newValue = listPhone[i].phoneNumber.replace(/[^0-9+]/gi, '');
        const tranformPhoneNumber =
          listPhone[i].phoneNumber.indexOf('+') === -1
            ? `+${newValue}`
            : newValue;
        const customer = await this.customerRepository.findOne({
          where: {
            phoneNumber: tranformPhoneNumber,
            status: EntityStatus.ACTIVE,
          },
        });

        if (!customer) {
          const newCustomer = new Customer();
          newCustomer.phoneNumber = tranformPhoneNumber;
          newCustomer.emailAddress = '';
          newCustomer.creationUserId = user ? user.id : '';
          await newCustomer.save();

          const groupCustomer = new GroupCustomer();
          groupCustomer.customer = newCustomer;
          groupCustomer.group = group;
          groupCustomer.creationUserId = user ? user.id : '';
          await groupCustomer.save();
        } else {
          const groupCustomer = await this.groupCustomerRepository.findOne({
            where: {
              customer: customer,
              group: group,
              status: EntityStatus.ACTIVE,
            },
          });

          if (!groupCustomer) {
            const newGroupCustomer = new GroupCustomer();
            newGroupCustomer.customer = customer;
            newGroupCustomer.group = group;
            newGroupCustomer.creationUserId = user ? user.id : '';
            await newGroupCustomer.save();
          }
        }
      }
    } catch (error) {
      throw new InternalServerErrorException();
    }
    return 'Add customer to group success !!';
  }

  async getCustomersInGroup(groupId: string) {
    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!group) throw new NotFoundException('Not found group');

    const groupCustomer = await this.groupCustomerRepository.find({
      relations: ['customer', 'group'],
      where: {
        group: group,
      },
    });
    const listCustomer = groupCustomer.map((item) => item.customer);

    return listCustomer;
  }

  async deleteCustomerInGroup(
    groupId: string,
    customerId: string,
    user = null,
  ) {
    const customer = await this.customerRepository.findOne({
      where: {
        id: customerId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!customer) throw new NotFoundException('Not found customer');

    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!group) throw new NotFoundException('Not found group');

    const groupCustomer = await this.groupCustomerRepository.findOne({
      where: {
        customer: customer,
        group: group,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!groupCustomer)
      throw new NotFoundException('Not found customer in group');

    try {
      groupCustomer.status = EntityStatus.DELETE;
      groupCustomer.lastModifiedUserId = user ? user.id : '';

      return await groupCustomer.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async editCustomer(
    id: string,
    editCustomerDto: EditCustomerDto,
    manager: EntityManager,
    user = null,
  ): Promise<any> {
    try {
      const customer = await this.customerRepository.findOne({
        where: {
          id: id,
          status: Not(EntityStatus.DELETE),
        },
        relations: ['campaignsOfCustomer'],
      });
      customer.lastModifiedUserId = user ? user.id : '';
      customer.fullName = editCustomerDto.name;
      await manager.save(customer);
      if (!customer) throw new NotFoundException('Not found Customer');
      const rs = await this.customerCampaignService.updateCustomerCampaigns(
        customer,
        editCustomerDto.campaigns,
        user,
        manager,
      );
      await manager.queryRunner.commitTransaction();
      return rs;
    } catch (error) {
      await manager.queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await manager.queryRunner.release();
    }
  }

  private extractPhoneNumber = (file: Buffer) => {
    try {
      const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
      const ws = workbook.Sheets[workbook.SheetNames[0]];

      //* convert sheet to json
      const extractedData = XLSX.utils.sheet_to_json(ws, {
        defval: '',
        header: ['customerPhone', 'companyPhone', 'campaignName'],
        raw: false,
      });

      //* setup return data
      const data = {
        data: extractedData,
        sheetName: workbook.SheetNames[0],
      };
      return data;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  };

  private formatPhone(value: string) {
    value = value.toString().trim();

    if (!value || value?.length < 10) return value;
    const plainPhone = value.replace(/[^0-9]/g, '');
    const standardPhone: any =
      plainPhone.length === 10 ? `+1${plainPhone}` : `+${plainPhone}`;
    return standardPhone;
  }

  async checkCustomer(dataCheck: any) {
    const listError = [];
    const listCustomerPhoneExisted = [];
    const data = [];
    for (let index = 0; index < dataCheck.length; index++) {
      const item = dataCheck[index];
      const customerPhone = this.formatPhone(item.customerPhone);
      const companyPhone = this.formatPhone(item.companyPhone);
      if (!item.customerPhone || item.customerPhone.length < 10) {
        listError.push({
          row: index + 2,
          reason: 'Format phone',
        });
        data.push({
          ...item,
          key: index + 2,
          error: true,
        });
        continue;
      } else {
        if (listCustomerPhoneExisted.includes(customerPhone)) {
          listError.push({
            row: index + 2,
            reason: 'Duplicate customer phone',
          });
          data.push({
            ...item,
            key: index + 2,
            error: true,
          });
          continue;
        }
      }
      const company = await getManager()
        .createQueryBuilder(Company, 'company')
        .where('company.phone = :companyPhone', {
          companyPhone: companyPhone,
        })
        .getOne();
      if (!company) {
        listError.push({
          row: index + 2,
          reason: 'Not found company',
        });
        data.push({
          ...item,
          key: index + 2,
          error: true,
        });
        continue;
      } else {
        const companyCustomer = await getManager()
          .createQueryBuilder(CompanyCustomer, 'companyCustomer')
          .innerJoinAndSelect('companyCustomer.customer', 'customer')
          .innerJoinAndSelect('companyCustomer.company', 'company')
          .where('customer.phoneNumber = :customerPhone', {
            customerPhone: customerPhone,
          })
          .andWhere('company.phone = :companyPhone', {
            companyPhone: companyPhone,
          })
          .getOne();
        if (!companyCustomer) {
          if (item.campaignName) {
            const campaign = await getManager()
              .createQueryBuilder(Campaign, 'campaign')
              .where('campaign.name = :campaignName', {
                campaignName: item.campaignName.trim(),
              })
              .getOne();
            if (!campaign) {
              listError.push({
                row: index + 2,
                reason: 'Not found campaign',
              });
              data.push({
                ...item,
                key: index + 2,
                error: true,
              });
              continue;
            }
            listCustomerPhoneExisted.push(customerPhone);
            data.push({
              ...item,
              key: index + 2,
              campaign: campaign,
              isNew: true,
            });
            continue;
          }
          listCustomerPhoneExisted.push(customerPhone);
          data.push({
            ...item,
            key: index + 2,
            isNew: true,
          });
          continue;
        } else {
          if (item.campaignName) {
            const campaign = await getManager()
              .createQueryBuilder(Campaign, 'campaign')
              .where('campaign.name = :campaignName', {
                campaignName: item.campaignName.trim(),
              })
              .getOne();
            if (!campaign) {
              listError.push({
                row: index + 2,
                reason: 'Not found campaign',
              });
              data.push({
                ...item,
                key: index + 2,
                error: true,
              });
              continue;
            }
            listCustomerPhoneExisted.push(customerPhone);
            data.push({
              ...item,
              key: index + 2,
              campaign: campaign,
            });
            continue;
          } else {
            listCustomerPhoneExisted.push(customerPhone);
            data.push({ ...item, key: index + 2 });
            continue;
          }
        }
      }
    }
    return {
      data: data,
      listError: listError,
    };
  }

  async readFile(file: any) {
    const fileData = this.extractPhoneNumber(file.buffer);
    const data = fileData.data;
    //* remove row header
    data.shift();
    return await this.checkCustomer(data);
  }

  async addCustomerFromExcel(data: any, user: any, manager: EntityManager) {
    const queryRunner = manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const customerPhone = this.formatPhone(item.customerPhone);
        const companyPhone = this.formatPhone(item.companyPhone);
        if (item.isNew) {
          const customer = await getManager()
            .createQueryBuilder(Customer, 'customer')
            .where('customer.phoneNumber = :customerPhone', {
              customerPhone: customerPhone,
            })
            .getOne();
          const company = await getManager()
            .createQueryBuilder(Company, 'company')
            .where('company.phone = :companyPhone', {
              companyPhone: companyPhone,
            })
            .getOne();
          if (!customer) {
            const customersCompany = await this.createCustomer(
              {
                companyCustomers: [
                  {
                    companyId: company.id,
                    status: EntityStatus.ACTIVE,
                  },
                ],
                campaignCustomers: [],
                fullName: '',
                phoneNumber: customerPhone,
                emailAddress: '',
                status: EntityStatus.ACTIVE,
              },
              manager,
              0,
              true,
              user,
              MessageDirection.OUTBOUND,
            );
            if (item.campaign) {
              const newCustomerCampaign = new CustomerCampaign();
              newCustomerCampaign.customer = customersCompany.customer;
              newCustomerCampaign.campaign = item.campaign;
              await manager.save(newCustomerCampaign);
              // await newCustomerCampaign.save();
            }
          } else {
            await this.addCustomerToCompany(
              customer,
              {
                companyId: company.id,
                status: EntityStatus.ACTIVE,
              },
              manager,
              0,
              (user = null),
              MessageDirection.OUTBOUND,
            );
            const campaign = await getManager()
              .createQueryBuilder(Campaign, 'campaign')
              .where('campaign.name = :campaignName', {
                campaignName: item.campaignName,
              })
              .getOne();
            const newCustomerCampaign = new CustomerCampaign();
            newCustomerCampaign.customer = customer;
            newCustomerCampaign.campaign = campaign;
            await manager.save(newCustomerCampaign);
            // await newCustomerCampaign.save();
          }
        } else {
          const customerCampaign = await getManager()
            .createQueryBuilder(CustomerCampaign, 'customerCampaign')
            .innerJoinAndSelect('customerCampaign.customer', 'customer')
            .innerJoinAndSelect('customerCampaign.campaign', 'campaign')
            .where('customer.phoneNumber = :customerPhone', {
              customerPhone: customerPhone,
            })
            .andWhere('campaign.name = :campaignName', {
              campaignName: item.campaignName,
            })
            .getOne();
          if (customerCampaign) {
            customerCampaign.status = EntityStatus.ACTIVE;
            await customerCampaign.save();
          } else {
            if (item.campaign) {
              const customer = await getManager()
                .createQueryBuilder(Customer, 'customer')
                .where('customer.phoneNumber = :customerPhone', {
                  customerPhone: customerPhone,
                })
                .getOne();
              const newCustomerCampaign = new CustomerCampaign();
              newCustomerCampaign.customer = customer;
              newCustomerCampaign.campaign = item.campaign;
              await newCustomerCampaign.save();
            }
          }
        }
      }
      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async addCustomerToCampaign(
    customer: Customer,
    campaignCustomer: CreateCampaignCustomerDto,
    manager: EntityManager,
    user = null,
  ) {
    try {
      const createdCustomerCampaign =
        await this.customerCampaignService.createCustomerCampaign(
          customer,
          campaignCustomer,
          manager,
          user,
        );

      return createdCustomerCampaign;
    } catch (error) {
      console.log(error);
    }
  }

  async validateCustomerCampaign(selectedPhones: string[]) {
    const campaignCustomer = getManager()
      .createQueryBuilder(CustomerCampaign, 'customerCampaign')
      .leftJoinAndSelect('customerCampaign.customer', 'customer')
      .leftJoinAndSelect('customerCampaign.campaign', 'campaign')
      .where('customer.phoneNumber IN (:...selectedPhones)', {
        selectedPhones: selectedPhones,
      })
      .andWhere('customerCampaign.status = :active', {
        active: EntityStatus.ACTIVE,
      })
      .getMany();
    return campaignCustomer;
  }
}
