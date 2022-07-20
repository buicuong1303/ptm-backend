import { LabelsService } from './../labels/labels.service';
import { AssignLabelDto } from './dto/assign-label.dto';
import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { NotificationType } from 'src/common/constant/notification-type';
import {
  Connection,
  EntityManager,
  getManager,
  Not,
  QueryRunner,
} from 'typeorm';
import { CompaniesService } from '../companies/companies.service';
import { CompanyRepository } from '../companies/repository/company.repository';
import { CompanyCustomersService } from '../company-customers/company-customers.service';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { CompanyUsersService } from '../company-users/company-users.service';
import { CustomersService } from '../customers/customers.service';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ParticipantsService } from '../participants/participants.service';
import { ParticipantRepository } from '../participants/repository/participant.repository';
import { User } from '../users/entity/user.entity';
import { EditConversationDto } from './dto/edit-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UpdateLastUserDto } from './dto/update-last-user.dto';
import { Conversation } from './entity/conversation.entity';
import { ConversationRepository } from './repository/conversation.repository';
import { Label } from '../labels/entity/label.entity';
import { MessageDirection } from 'src/common/constant/message-direction';
import { Customer } from '../customers/entity/customer.entity';
import { CompanyCustomer } from '../company-customers/entity/company-customer.entity';
import { Company } from '../companies/entity/company.entity';

@Injectable()
export class ConversationsService {
  private participantsService: ParticipantsService = null;
  // private customersService: CustomersService = null;
  constructor(
    private readonly _moduleRef: ModuleRef,
    @InjectRepository(ConversationRepository)
    private readonly conversationRepository: ConversationRepository,
    private readonly companyCustomerRepository: CompanyCustomerRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly connection: Connection,
    private readonly notificationService: NotificationsService,
    private readonly companyUsersService: CompanyUsersService,
    private readonly companyCustomersService: CompanyCustomersService,
    private readonly companiesService: CompaniesService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    private readonly _labelsService: LabelsService,
    @Inject(forwardRef(() => CustomersService))
    private readonly customersService: CustomersService,
  ) {
    this.participantsService = this._moduleRef.get(ParticipantsService, {
      strict: false,
    });
    // this.customersService = this._moduleRef.get(CustomersService, {
    //   strict: false,
    // });
  }

  async createConversation() {
    try {
      const newConversation = new Conversation();
      // newConversation.name = name;
      return await newConversation.save();
    } catch (error) {
      throw new Error('Can not create conversation');
    }
  }

  async isExistConversation(id: string) {
    return this.conversationRepository.findOne({
      where: {
        id,
        status: Not(EntityStatus.DELETE),
      },
    });
  }

  async getConversations() {
    try {
      return await this.conversationRepository.find({
        where: {
          status: EntityStatus.ACTIVE,
        },
      });
    } catch (error) {
      throw new NotFoundException('Not found conversations');
    }
  }

  async getConversationsOfUser(
    currentUser: any,
    companyId: any,
    page: number,
    limitConversations: any,
    limitMessageInConversations: any,
    filters,
  ) {
    try {
      const { types, search, labels, users } = filters;
      const companyUser = await this.companyUsersService.getCompanyOfUser(
        currentUser.id,
        companyId,
      );
      if (!companyUser) throw new NotFoundException('Not found company user');
      const { data, total, umn } =
        await this.participantsService.getConversationsInCompanyOfUser(
          companyUser.id,
          page,
          limitConversations,
          types,
          search,
          labels,
          users,
        ); //* return [ Participant {'id', companyUser: { id, [User] }, Conversation}, ... ]

      const conversationsOfUser = data.map(async (item: any) => {
        const messages = await this.messagesService.getMessagesInConversation(
          item.conversation.id,
          0,
          limitMessageInConversations,
        );

        const labels = item.conversation.labels
          ? await this._labelsService.getLabelsWithIds(item.conversation.labels)
          : [];
        return {
          participantId: item.id,
          umn: item.umn,
          isCompleted: item.conversation.isCompleted,
          newOrExisting: item.conversation.newOrExisting,
          customer: {
            id: item.conversation.companyCustomer.customer.id,
            fullName: item.conversation.companyCustomer.customer.fullName,
            phoneNumber: item.conversation.companyCustomer.customer.phoneNumber,
            email: item.conversation.companyCustomer.customer.email,
            status: item.conversation.companyCustomer.customer.status,
            companies:
              item.conversation.companyCustomer.customer.companiesOfCustomer.map(
                (item) => item.company.name,
              ),
            campaigns:
              item.conversation.companyCustomer.customer.campaignsOfCustomer.map(
                (item) => ({
                  id: item.id,
                  value: item.campaign.id,
                  label: item.campaign.name,
                  status: item.status,
                }),
              ),
          },
          messages: messages.data,
          id: item.conversation.id,
          creationUserId: item.conversation.creationUserId,
          lastModifiedUserId: item.conversation.lastModifiedUserId,
          status: item.conversation.status,
          creationTime: item.conversation.creationTime,
          lastModifiedTime: item.conversation.lastModifiedTime,
          lastMessage: item.conversation.lastMessage,
          lastUser: item.conversation.lastUser,
          labels: labels,
        };
      });
      const conversationsFullInformation: any = await Promise.all(
        conversationsOfUser,
      );
      return {
        data: conversationsFullInformation,
        pagination: {
          total,
          umn,
        },
      };
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Not found conversations');
    }
  }

  async getNewConversationOfUser(
    currentUser: any,
    conversationId: string,
    companyCode: string,
    limitMessageInConversations: number,
  ) {
    try {
      const company = await this.companyRepository.findOne({
        where: {
          code: companyCode,
        },
      });
      const companyUser = await this.companyUsersService.getCompanyOfUser(
        currentUser.id,
        company.id,
      );
      const participant = await this.participantRepository.findOne({
        where: {
          conversation: conversationId,
          companyUser: companyUser.id,
        },
      });

      await this.participantsService.updateLastModifiedTime(participant.id);

      const customer =
        this.companyCustomersService.getCustomerByConversationId(
          conversationId,
        );
      const messages = this.messagesService.getMessagesInConversation(
        conversationId,
        0,
        limitMessageInConversations,
      );
      const conversation = this.getConversation(conversationId);

      const data = await Promise.all([customer, messages, conversation]);
      const labels = data[2].labels
        ? await this._labelsService.getLabelsWithIds(data[2].labels)
        : [];

      const newConversationOfUser = {
        customer: data[0],
        messages: data[1].data,
        ...data[2],
        participant: {
          participantId: participant.id,
          umn: participant.umn,
        },
        labels: labels,
      };
      return newConversationOfUser;
    } catch (error) {
      throw new NotFoundException('Not found conversation');
    }
  }

  async getConversation(id: string) {
    try {
      const infoConversation = await this.conversationRepository.findOne({
        where: {
          id: id,
          status: Not(EntityStatus.DELETE),
        },
        relations: [
          'lastMessage',
          'lastMessage.lastModifiedUserId',
          'lastUser',
        ],
      });
      return infoConversation;
    } catch (error) {
      throw new NotFoundException('Not found conversation');
    }
  }

  async updateLastMessageAndUser(
    id: string,
    updateConversationDto: UpdateConversationDto,
    manager: EntityManager,
  ) {
    const { lastMessage, lastUser } = updateConversationDto;

    const infoConversation = await manager
      .createQueryBuilder(Conversation, 'conversation')
      .leftJoin('conversation.lastMessage', 'lastMessage')
      .leftJoin('conversation.lastUser', 'lastUser')
      .where('conversation.id = :id', { id: id })
      .getOne();

    if (!infoConversation)
      throw new NotFoundException('Not found conversation');

    infoConversation.lastMessage = lastMessage;
    infoConversation.lastUser = lastUser || infoConversation.lastUser;
    return manager.save(infoConversation);
  }

  async updateLastUser(id: string, updateLastUserDto: UpdateLastUserDto) {
    const { lastUser } = updateLastUserDto;
    const infoConversation = await this.conversationRepository.findOne({
      relations: ['lastUser'],
      where: {
        id,
      },
    });
    if (!infoConversation)
      throw new NotFoundException('Not found conversation');

    infoConversation.lastUser = lastUser || infoConversation.lastUser;
    return infoConversation;
  }

  async remove(id: string) {
    const infoConversation = await this.conversationRepository.findOne(id);
    if (!infoConversation)
      throw new NotFoundException('Not found conversation');

    infoConversation.status = EntityStatus.DELETE;
    try {
      await infoConversation.save();
    } catch (error) {}
    return `This action removes a #${id} conversation`;
  }

  async getConversationByPhone(
    phoneFrom: string,
    phoneTo: string,
  ): Promise<any> {
    try {
      const customer = await this.customerRepository.findOne({
        where: {
          phoneNumber: phoneFrom,
          status: EntityStatus.ACTIVE,
        },
      });
      if (!customer) return false;

      const company = await this.companyRepository.findOne({
        where: {
          phone: phoneTo,
          status: EntityStatus.ACTIVE,
        },
      });
      if (!company) return false;

      const companyOfCustomer = await this.companyCustomerRepository.findOne({
        relations: ['conversation'],
        where: {
          customer: customer,
          company: company,
          status: EntityStatus.ACTIVE,
        },
      });
      if (!companyOfCustomer) return false;

      const conversation = await this.conversationRepository.findOne({
        where: {
          id: companyOfCustomer.conversation.id,
          status: EntityStatus.ACTIVE,
        },
      });
      if (!conversation) return false;

      return {
        conversation: conversation,
        company: company,
        customer: customer,
      };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async createConversationWithNewCustomer(
    phoneFrom: string,
    phoneTo: string,
    queryRunner: QueryRunner,
    user = null,
  ) {
    const customerExisted = await queryRunner.manager
      .createQueryBuilder(Customer, 'customer')
      .where('customer.phoneNumber = :phoneNumber', { phoneNumber: phoneFrom })
      .andWhere('customer.status = :status', { status: EntityStatus.ACTIVE })
      .getOne();
    if (!customerExisted) {
      const company = await queryRunner.manager
        .createQueryBuilder(Company, 'company')
        .where('company.phone = :phoneNumber', { phoneNumber: phoneTo })
        .andWhere('company.status = :status', { status: EntityStatus.ACTIVE })
        .getOne();
      if (!company) throw new NotFoundException('Not found Company');

      try {
        const enhancedCustomers = await this.customersService.createCustomer(
          {
            companyCustomers: [
              {
                companyId: company.id,
                status: EntityStatus.ACTIVE,
              },
            ],
            fullName: '',
            phoneNumber: phoneFrom,
            emailAddress: '',
            status: EntityStatus.ACTIVE,
          },
          queryRunner.manager,
          1,
          false,
          user,
          MessageDirection.INBOUND,
        );

        await this.notificationService.pushNotify(
          {
            entityId: enhancedCustomers[0].companyCustomer.customer.id,
            notificationTypeId: NotificationType.NEW_CLIENT,
            company: company,
          },
          queryRunner,
        );

        const conversation = enhancedCustomers[0].companyCustomer.conversation;
        if (!conversation) return false;

        return {
          conversation: conversation,
          company: company,
          customer: enhancedCustomers[0].companyCustomer.customer,
        };
      } catch (error) {
        return error;
      }
    } else {
      try {
        const company = await this.companiesService.getCompanyByPhone(phoneTo);
        if (!company) throw new NotFoundException('Not found Company');
        let companyOfCustomer = await queryRunner.manager
          .createQueryBuilder(CompanyCustomer, 'companyCustomer')
          .innerJoinAndSelect('companyCustomer.conversation', 'conversation')
          .innerJoinAndSelect('companyCustomer.customer', 'customer')
          .innerJoinAndSelect('companyCustomer.company', 'company')
          .where('customer.id = :customerId', {
            customerId: customerExisted.id,
          })
          .andWhere('company.id = :companyId', { companyId: company.id })
          .andWhere('companyCustomer.status = :status', {
            status: EntityStatus.ACTIVE,
          })
          .getOne();

        if (!companyOfCustomer) {
          const dataAddCustomerToCompany =
            await this.customersService.addCustomerToCompany(
              customerExisted,
              {
                companyId: company.id,
                status: EntityStatus.ACTIVE,
              },
              queryRunner.manager,
              0,
              user,
              MessageDirection.INBOUND,
            );
          companyOfCustomer = dataAddCustomerToCompany.companyCustomer;
          await this.notificationService.pushNotify(
            {
              entityId: customerExisted.id,
              notificationTypeId: NotificationType.NEW_CLIENT,
              company: company,
            },
            queryRunner,
          );
        }
        const conversation = await queryRunner.manager
          .createQueryBuilder(Conversation, 'conversation')
          .where('conversation.id = :conversationId', {
            conversationId: companyOfCustomer.conversation.id,
          })
          .andWhere('conversation.status = :status', {
            status: EntityStatus.ACTIVE,
          })
          .getOne();
        if (!conversation) return false;

        return {
          conversation: conversation,
          company: company,
          customer: customerExisted,
        };
      } catch (error) {
        return error;
      }
    }
  }

  async updateLastModifiedTime(conversationId: string): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: {
        id: conversationId,
      },
    });

    try {
      conversation.lastModifiedTime = new Date();
      await conversation.save();
      return conversation;
    } catch (error) {
      throw new Error();
    }
  }

  async editConversation(
    conversationId: string,
    editConversationDto: EditConversationDto,
    user: User,
  ): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: {
        id: conversationId,
      },
    });
    if (!conversation)
      throw new NotFoundException('Conversation does not exist');

    try {
      conversation.isCompleted =
        editConversationDto.isCompleted !== undefined
          ? editConversationDto.isCompleted
          : conversation.isCompleted;
      conversation.newOrExisting = editConversationDto.newOrExisting
        ? editConversationDto.newOrExisting
        : conversation.newOrExisting;
      conversation.lastModifiedUserId = user.id;
      await conversation.save();
      return conversation;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async assignLabelsToConversation(
    conversationId: string,
    assignLabels: AssignLabelDto,
  ) {
    const conversation = await this.conversationRepository.findOne({
      where: {
        id: conversationId,
        status: EntityStatus.ACTIVE,
      },
      relations: ['companyCustomer', 'companyCustomer.company'],
    });

    if (!conversation) throw new NotFoundException('Not found Conversation');

    conversation.labels = [...assignLabels.labels];
    await conversation.save();

    let labels = [];
    if (conversation.labels.length > 0) {
      labels = await getManager()
        .createQueryBuilder(Label, 'label')
        .where('label.id IN (:...labelIds)', { labelIds: conversation.labels })
        .andWhere('label.status = :status', { status: EntityStatus.ACTIVE })
        .orderBy('label.title')
        .andWhere('label.status = :status', { status: EntityStatus.ACTIVE })
        .getMany();
    }

    return {
      labels: labels,
      companyCode: conversation.companyCustomer.company.code,
      conversationId: conversation.id,
    };
  }

  async editConversations(
    ids: Array<string>,
    editConversations,
    user: User,
  ): Promise<any> {
    if (editConversations.isCompleted !== undefined) {
      return ids?.length > 0
        ? await getManager()
            .createQueryBuilder()
            .update(Conversation)
            .andWhere('isCompleted = :isCompleted', {
              isCompleted: !editConversations.isCompleted,
            })
            .andWhere('id IN (:...ids)', {
              ids: ids,
            })
            .set({
              isCompleted: editConversations.isCompleted,

              lastModifiedUserId: user ? user.id : '',
            })
            .execute()
        : [];
    }
    if (editConversations.newOrExisting !== undefined) {
      return ids?.length > 0
        ? await getManager()
            .createQueryBuilder()
            .update(Conversation)

            .andWhere('id IN (:...ids)', {
              ids: ids,
            })
            .set({
              newOrExisting: editConversations.newOrExisting,

              lastModifiedUserId: user ? user.id : '',
            })
            .execute()
        : [];
    }
  }

  async getCustomerWithConversationId(conversationId: string): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: {
        id: conversationId,
        status: EntityStatus.ACTIVE,
      },
      relations: ['companyCustomer', 'companyCustomer.customer'],
    });

    if (!conversation) throw new NotFoundException();

    return conversation;
  }
}
