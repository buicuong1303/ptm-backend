import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { MessageDirection } from 'src/common/constant/message-direction';
import { ReadStatus } from 'src/common/constant/read-status';
import { UserRepository } from 'src/modules/users/repository/user.repository';
import { EntityManager, getManager, QueryRunner } from 'typeorm';
import { CompanyUsersService } from '../company-users/company-users.service';
import { CompanyUser } from '../company-users/entity/company-user.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/entity/conversation.entity';
import { UpdateReadStatusDto } from './dto/update-read-status.dto';
import { UpdateUmnDto } from './dto/update-umn.dto';
import { Participant } from './entity/participant.entity';
import { ParticipantRepository } from './repository/participant.repository';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(ParticipantRepository)
    private readonly participantRepository: ParticipantRepository,

    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,

    private readonly companyUserService: CompanyUsersService,

    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationService: ConversationsService,
  ) {}
  private readonly logger = new Logger(ParticipantsService.name);
  //* read status conversation cho từng user
  async updateReadStatus(
    updateReadStatusDto: UpdateReadStatusDto,
    participantId: string,
  ): Promise<any> {
    const infoParticipant = await this.participantRepository.findOne({
      where: {
        id: participantId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!infoParticipant) throw new NotFoundException('Not found participant');

    try {
      infoParticipant.readStatus = ReadStatus.READ;
      infoParticipant.umn = 0;
      infoParticipant.lastModifiedTime = new Date();

      return await infoParticipant.save();
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  //* update LastModifiedTime conversation change information
  async updateLastModifiedTime(participantId: string): Promise<any> {
    const participant = await this.participantRepository.findOne({
      where: {
        id: participantId,
      },
    });
    if (!participant) throw new NotFoundException('Not found participant');

    try {
      participant.lastModifiedTime = new Date();
      await participant.save();

      return participant;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //* update umn when new message anh read message
  async updateUmnWithNewMessage(
    participantId: string,
    entityManager?: EntityManager,
  ): Promise<any> {
    let participant: Participant = null;

    if (entityManager) {
      if (participant) throw new NotFoundException('Not found participant');

      participant = await entityManager
        .createQueryBuilder(Participant, 'participant')
        .where('participant.id = :participantId', { participantId })
        .innerJoinAndSelect('participant.companyUser', 'companyUser')
        .innerJoinAndSelect('companyUser.user', 'user')
        .getOne();

      participant.umn += 1;
      participant.readStatus = ReadStatus.UNREAD;
      await entityManager.save(participant);
    } else {
      participant = await this.participantRepository.findOne({
        where: {
          id: participantId,
        },
        relations: ['companyUser', 'companyUser.user'],
      });
      if (!participant) throw new NotFoundException('Not found participant');

      participant.umn += 1;
      participant.readStatus = ReadStatus.UNREAD;
      await participant.save();
    }

    return { user: participant.companyUser.user, ...participant };
  }

  //* update umn when new message anh read message
  async updateUmnConversation(
    participantId: string,
    readStatus: ReadStatus = ReadStatus.READ,
  ): Promise<any> {
    const participant = await this.participantRepository.findOne({
      where: {
        id: participantId,
      },
    });
    if (!participant) throw new NotFoundException('Not found participant');

    try {
      participant.lastModifiedTime = new Date();
      if (readStatus === ReadStatus.UNREAD) {
        participant.readStatus = ReadStatus.UNREAD;
        participant.umn = participant.umn > 0 ? participant.umn : 1;
      } else {
        participant.umn = 0;
        participant.readStatus = ReadStatus.READ;
      }
      await participant.save();

      return participant;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updateUmnConversations(
    updateUmnDto: UpdateUmnDto,
    userRequest,
  ): Promise<any> {
    if (updateUmnDto.readStatus === ReadStatus.READ) {
      return updateUmnDto?.participantIds?.length > 0
        ? await getManager()
            .createQueryBuilder()
            .update(Participant)
            .andWhere('id IN (:...participantIds)', {
              participantIds: updateUmnDto?.participantIds,
            })
            .set({
              umn: 0,
              readStatus: ReadStatus.READ,
              lastModifiedUserId: userRequest ? userRequest.id : '',
            })
            .execute()
        : [];
    } else {
      const updateUmnParticipants =
        updateUmnDto?.participantIds?.length > 0
          ? await getManager()
              .createQueryBuilder()
              .update(Participant)
              .where('id IN (:...participantIds)', {
                participantIds: updateUmnDto?.participantIds,
              })
              .andWhere('umn = :umn', {
                umn: 0,
              })
              .set({
                umn: 1,
                readStatus: ReadStatus.UNREAD,
                lastModifiedUserId: userRequest ? userRequest.id : '',
              })
              .execute()
          : [];

      return updateUmnParticipants;
    }
  }

  async getUsersInConversation(
    conversationId: string,
    queryRunner: QueryRunner,
  ): Promise<any> {
    try {
      const participants = await queryRunner.manager
        .createQueryBuilder(Participant, 'participant')
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .innerJoinAndSelect('participant.companyUser', 'companyUser')
        .innerJoinAndSelect('companyUser.user', 'user')
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('participant.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .getMany();
      if (!participants) throw new NotFoundException('Not found participant');

      const participantList = participants.map((item) => {
        return {
          user: item.companyUser.user,
          ...item,
        };
      });

      return participantList.filter(
        (item) => item.companyUser.status === EntityStatus.ACTIVE,
      );
    } catch (error) {
      this.logger.error(error);

      throw new InternalServerErrorException();
    }
  }

  async getUsersWithParticipant(participantId: string): Promise<any> {
    try {
      const participants = await this.participantRepository.find({
        where: {
          id: participantId,
          status: EntityStatus.ACTIVE,
        },
        relations: ['companyUser', 'companyUser.user'],
      });
      if (!participants) throw new NotFoundException('Not found participant');

      const participantList = participants.map((item) => {
        return {
          user: item.companyUser.user,
          ...item,
        };
      });

      return participantList.filter(
        (item) => item.companyUser.status === EntityStatus.ACTIVE,
      );
    } catch (error) {
      this.logger.error(error);

      throw new InternalServerErrorException();
    }
  }

  async addUserIntoConversation(
    conversation: Conversation,
    companyUser: CompanyUser,
    manager: EntityManager,
    umn = 0,
    user = null,
  ): Promise<any> {
    try {
      const participant = new Participant();
      participant.conversation = conversation;
      participant.companyUser = companyUser;
      participant.umn = umn;
      participant.lastModifiedUserId = user ? user.id : '';

      return await manager.save(participant);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async removeUserFromConversation(
    conversationId: string,
    userId: string,
    user = null,
  ): Promise<any> {
    const infoUser = await this.participantRepository.findOne({
      where: {
        user: userId,
        conversation: conversationId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!infoUser) throw new NotFoundException('Not found user');

    try {
      infoUser.status = EntityStatus.DELETE;
      infoUser.lastModifiedUserId = user ? user.id : '';

      return await infoUser.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getConversationsInCompanyOfUser(
    companyUserId: string,
    page = 0,
    limitConversations = 10,
    types = [],
    search = '',
    labels = [],
    users = [],
  ): Promise<any> {
    try {
      const unreadMessagesCountSql = await getManager()
        .createQueryBuilder(Participant, 'participant')
        .select('SUM(participant.umn)', 'sum')
        .innerJoin(
          'participant.companyUser',
          'companyUser',
          'companyUser.id = :id',
          { id: companyUserId },
        )
        .innerJoin('participant.conversation', 'conversation')
        .innerJoin('conversation.companyCustomer', 'companyCustomer')
        .innerJoin('companyCustomer.customer', 'customer')
        .leftJoin('conversation.lastMessage', 'lastMessage')
        .andWhere('participant.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('customer.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('conversation.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .getRawOne();
      const conversationOfUserSql = getManager()
        .createQueryBuilder(Participant, 'participant')
        .select([
          'participant.id',
          'participant.umn',
          'companyCustomer.id',
          'companiesOfCustomer.id',
          'company.name',
          'conversation.labels',
        ])
        .innerJoin(
          'participant.companyUser',
          'companyUser',
          'companyUser.id = :id',
          { id: companyUserId },
        )
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .leftJoinAndSelect('conversation.lastUser', 'lastUser')
        .innerJoin('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .leftJoinAndSelect(
          'customer.campaignsOfCustomer',
          'campaignsOfCustomer',
        )
        .leftJoinAndSelect('campaignsOfCustomer.campaign', 'campaign')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .innerJoin('customer.companiesOfCustomer', 'companiesOfCustomer')
        .innerJoinAndSelect('companiesOfCustomer.company', 'companies')
        .andWhere('participant.status = :status', {
          status: EntityStatus.ACTIVE,
        })

        .andWhere('customer.status = :status', {
          status: EntityStatus.ACTIVE,
        })

        .andWhere('conversation.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('company.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('companyCustomer.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .orderBy('lastMessage.mode', 'ASC')
        .addOrderBy('conversation.lastModifiedTime', 'DESC')
        .skip((+page - 1) * limitConversations)
        .take(limitConversations);

      const conversationsOfUserCountSql = getManager()
        .createQueryBuilder(Participant, 'participant')
        .innerJoin(
          'participant.companyUser',
          'companyUser',
          'companyUser.id = :id',
          { id: companyUserId },
        )
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .leftJoinAndSelect('conversation.lastUser', 'lastUser')
        .innerJoin('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .andWhere('participant.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('customer.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('company.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('conversation.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .andWhere('companyCustomer.status = :status', {
          status: EntityStatus.ACTIVE,
        });
      if (search) {
        conversationOfUserSql.andWhere('customer.phoneNumber LIKE :phone', {
          phone: `%${search}%`,
        });
        conversationsOfUserCountSql.andWhere(
          'customer.phoneNumber LIKE :phone',
          {
            phone: `%${search}%`,
          },
        );
      }
      if (labels.length > 0) {
        conversationOfUserSql.andWhere('conversation.labels && :labels', {
          labels: labels.map((item) => item.value),
        });

        conversationsOfUserCountSql.andWhere('conversation.labels && :labels', {
          labels: labels.map((item) => item.value),
        });
      }
      if (types.length > 0) {
        types.forEach((type) => {
          if (type.value === 'unread') {
            conversationOfUserSql.andWhere('participant.umn > :umn', {
              umn: 0,
            });

            conversationsOfUserCountSql.andWhere('participant.umn > :umn', {
              umn: 0,
            });
          } else if (type.value === 'incomplete') {
            conversationOfUserSql.andWhere(
              'conversation.isCompleted = :isCompleted',
              {
                isCompleted: false,
              },
            );

            conversationsOfUserCountSql.andWhere(
              'conversation.isCompleted = :isCompleted',
              {
                isCompleted: false,
              },
            );
          } else if (type.value === 'completed') {
            conversationOfUserSql.andWhere(
              'conversation.isCompleted = :isCompleted',
              {
                isCompleted: true,
              },
            );

            conversationsOfUserCountSql.andWhere(
              'conversation.isCompleted = :isCompleted',
              {
                isCompleted: true,
              },
            );
          } else if (type.value === 'new') {
            conversationOfUserSql.andWhere(
              'conversation.newOrExisting = :newOrExisting',
              {
                newOrExisting: 'new',
              },
            );

            conversationsOfUserCountSql.andWhere(
              'conversation.newOrExisting = :newOrExisting',
              {
                newOrExisting: 'new',
              },
            );
          } else if (type.value === 'existing') {
            conversationOfUserSql.andWhere(
              'conversation.newOrExisting = :newOrExisting',
              {
                newOrExisting: 'existing',
              },
            );

            conversationsOfUserCountSql.andWhere(
              'conversation.newOrExisting = :newOrExisting',
              {
                newOrExisting: 'existing',
              },
            );
          } else {
            conversationOfUserSql.andWhere(
              'lastMessage.direction = :direction',
              {
                direction: MessageDirection.INBOUND,
              },
            );
            conversationsOfUserCountSql.andWhere(
              'lastMessage.direction = :direction',
              {
                direction: MessageDirection.INBOUND,
              },
            );
          }
        });
      }
      if (users.length > 0) {
        conversationOfUserSql.andWhere('lastUser.id IN (:...userIds)', {
          userIds: users.map((item) => item.value),
        });
        conversationsOfUserCountSql.andWhere('lastUser.id IN (:...userIds)', {
          userIds: users.map((item) => item.value),
        });
      }

      const conversationsOfUser = await conversationOfUserSql.getMany();
      return {
        data: conversationsOfUser,
        total: await conversationsOfUserCountSql.getCount(),
        umn: +unreadMessagesCountSql.sum,
      };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getCustomerWithParticipantId(participantId: string): Promise<any> {
    const participant = await this.participantRepository.findOne({
      where: {
        id: participantId,
        status: EntityStatus.ACTIVE,
      },
      relations: [
        'conversation',
        'conversation.companyCustomer',
        'conversation.companyCustomer.customer',
      ],
    });

    if (!participant) throw new NotFoundException();

    return participant;
  }
}
