import { CallRepository } from './../messages/repository/call.repository ';
/* eslint-disable prefer-const */
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityName } from 'src/common/constant/entity-name';
import { EntityStatus } from 'src/common/constant/entity-status';
import { getManager, Not, QueryRunner } from 'typeorm';
import { MessageRepository } from '../messages/repository/message.repository';
import { NotificationTypeRepository } from './repository/notification-type.repository';
import { NotificationTemplateDto } from './dto/get-notification-template.dto';
import { NotificationTemplate } from './entity/notification-template.entity';
import { NotificationTemplateRepository } from './repository/notification-template.repository';
import { UserRepository } from '../users/repository/user.repository';
import { NotificationReceiver } from './entity/notification-receiver.entity';
import { CreateNotificationTypeDto } from './dto/create-notification-type.dto';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { Customer } from '../customers/entity/customer.entity';
import { RealtimeService } from '../services/amqp/services/realtime.service';
import { NotificationCreator } from './entity/notification-creator.entity';
import { CompanyUser } from '../company-users/entity/company-user.entity';
import { NotificationReceiverRepository } from './repository/notification-receiver.repository';
import { NotificationType as NotificationTypeEnum } from 'src/common/constant/notification-type';
import { NotificationType } from './entity/notification-type.entity';
import { NotificationCreatorRepository } from './repository/notification-creator.repository';
import { CompanyUserRepository } from '../company-users/repository/company-user.repository';
import { ReadStatus } from 'src/common/constant/read-status';
import { Call } from '../messages/entity/call.entity';
import { formatPhoneNumber } from '../../common/utils/formatPhoneNumber';
import { Message } from '../messages/entity/message.entity';
@Injectable()
export class NotificationsService {
  constructor(
    private readonly _realTimeService: RealtimeService,
    @InjectRepository(NotificationTypeRepository)
    private readonly notificationTypeRepository: NotificationTypeRepository,
    @InjectRepository(NotificationTemplateRepository)
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    @InjectRepository(MessageRepository)
    private readonly messageRepository: MessageRepository,
    @InjectRepository(CustomerRepository)
    private readonly customerRepository: CustomerRepository,
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    @InjectRepository(NotificationReceiverRepository)
    private readonly notificationReceiverRepository: NotificationReceiverRepository,
    @InjectRepository(NotificationCreatorRepository)
    private readonly notificationCreatorRepository: NotificationCreatorRepository,
    @InjectRepository(CompanyUserRepository)
    private readonly _callRepository: CallRepository,
  ) {}

  async pushNotify(
    notificationTemplateDto: NotificationTemplateDto,
    queryRunner: QueryRunner,
  ) {
    try {
      let notificationTemplate = null;
      let infoEntity = null;
      let content = '';
      const { notificationTypeId, entityId, entity, creator, client, company } =
        notificationTemplateDto;

      //* check notification type and valid entityId
      const infoNotificationType =
        await this.notificationTypeRepository.findOne({
          where: {
            status: Not(EntityStatus.DELETE),
            id: notificationTypeId,
          },
        });
      if (!infoNotificationType)
        throw new NotFoundException('Not found notification type');

      //* get notification template
      notificationTemplate = await this.notificationTemplateRepository.findOne({
        where: {
          status: Not(EntityStatus.DELETE),
          notificationType: infoNotificationType.id,
          entityId: entityId,
        },
      });

      //*if not exist => create
      if (!notificationTemplate) {
        const newNotificationTemplate = new NotificationTemplate();
        newNotificationTemplate.entityId = entityId;
        newNotificationTemplate.notificationType = infoNotificationType;
        notificationTemplate = await queryRunner.manager.save(
          newNotificationTemplate,
        );
        // await queryRunner.commitTransaction();
      }

      switch (infoNotificationType.entity) {
        case EntityName.MESSAGE:
          infoEntity =
            entity ||
            (await queryRunner.manager
              .getRepository(Message)
              .createQueryBuilder('message')
              .where('message.id = :messageId', {
                messageId: entityId,
              })
              .innerJoinAndSelect('message.conversation', 'conversation')
              .innerJoinAndSelect(
                'conversation.companyCustomer',
                'companyCustomer',
              )
              .innerJoinAndSelect('companyCustomer.customer', 'customer')
              .leftJoinAndSelect('message.attachments', 'attachments')
              .getOne());
          if (!infoEntity)
            throw new NotFoundException(
              `Not found ${infoNotificationType.entity}`,
            );

          switch (infoNotificationType.id) {
            case NotificationTypeEnum.INBOUND_MESSAGE:
              content = infoNotificationType.content
                .replace(
                  '{client}',
                  formatPhoneNumber(
                    client?.phoneNumber ||
                      infoEntity?.conversation?.companyCustomer?.customer
                        ?.phoneNumber,
                  ),
                )
                .replace('{company}', company.name)
                .replace(
                  '{message}',
                  infoEntity.text ||
                    infoEntity.attachments?.length +
                      (infoEntity.attachments?.length < 2
                        ? ' attachment'
                        : ' attachments'),
                );
              break;

            default:
              break;
          }
          break;

        case EntityName.CLIENT:
          infoEntity =
            entity || (await queryRunner.manager.findOne(Customer, entityId));
          if (!infoEntity)
            throw new NotFoundException(
              `Not found ${infoNotificationType.entity}`,
            );

          switch (notificationTypeId) {
            case NotificationTypeEnum.NEW_CLIENT:
              content = infoNotificationType.content
                .replace(
                  '{client}',
                  formatPhoneNumber(
                    client?.phoneNumber || infoEntity?.phoneNumber,
                  ),
                )
                .replace('{company}', company?.name);
              break;

            case NotificationTypeEnum.NEW_CLIENT_BY_USER:
              content = infoNotificationType.content
                .replace(
                  '{client}',
                  formatPhoneNumber(
                    client?.phoneNumber || infoEntity?.phoneNumber,
                  ),
                )
                .replace('{company}', company?.name)
                .replace(
                  '{user}',
                  creator?.firstName + ' ' + creator?.lastName,
                );
              break;

            case NotificationTypeEnum.NEW_CLIENT_BY_SOFTPHONE:
              content = infoNotificationType.content
                .replace('{client}', formatPhoneNumber(infoEntity.phoneNumber))
                .replace('{company}', company?.name);
              break;

            default:
              break;
          }
          break;

        case EntityName.CALL:
          switch (infoNotificationType.id) {
            case NotificationTypeEnum.MISSED_CALL:
              infoEntity =
                entity ||
                (await queryRunner.manager
                  .getRepository(Call)
                  .createQueryBuilder('call')
                  .where('call.id = :callId', {
                    callId: entityId,
                  })
                  .innerJoinAndSelect('call.message', 'message')
                  .innerJoinAndSelect('message.conversation', 'conversation')
                  .innerJoinAndSelect(
                    'conversation.companyCustomer',
                    'companyCustomer',
                  )
                  .innerJoinAndSelect('companyCustomer.customer', 'customer')
                  .getOne());

              if (!infoEntity) {
                throw new NotFoundException(
                  `Not found ${infoNotificationType.entity}`,
                );
              }

              content = infoNotificationType.content
                .replace(
                  '{type}',
                  infoEntity.externalCallStatus === 'Missed'
                    ? 'Missed Call'
                    : infoEntity.externalCallStatus,
                )
                .replace(
                  '{client}',
                  formatPhoneNumber(
                    client?.phoneNumber ||
                      infoEntity?.message?.conversation?.companyCustomer
                        ?.customer?.phoneNumber,
                  ),
                )
                .replace('{company}', company.name)
                .replace(
                  '{duration}',
                  `0${Math.floor(infoEntity.duration / 60)}`.slice(-2) +
                    ':' +
                    `0${
                      infoEntity.duration -
                      Math.floor(infoEntity.duration / 60) * 60
                    }`.slice(-2),
                );
              break;

            default:
              break;
          }
        default:
          break;
      }

      let queryCompanyUsers = await getManager()
        .createQueryBuilder(CompanyUser, 'companyUser')
        .select('companyUser.id')
        .addSelect('user')
        .addSelect('company')
        .innerJoin('companyUser.user', 'user')
        .innerJoin('companyUser.company', 'company')
        .andWhere('company.id = :companyId', {
          companyId: company.id,
        })
        .andWhere('user.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('companyUser.status != :status', {
          status: EntityStatus.DELETE,
        });

      if (notificationTemplateDto.creator) {
        queryCompanyUsers.andWhere('user.id != :creatorId', {
          creatorId: notificationTemplateDto.creator.id,
        });
        const newNotificationReceiver = new NotificationCreator();
        newNotificationReceiver.notificationTemplate = notificationTemplate;
        newNotificationReceiver.creator = notificationTemplateDto.creator;
        await queryRunner.manager.save(newNotificationReceiver);
      }

      let infoCompanyUsers = await queryCompanyUsers.getMany();
      //* add notification template to each receiver
      const createNotificationReceiver = infoCompanyUsers.map((companyUser) => {
        const newNotificationReceiver = new NotificationReceiver();
        newNotificationReceiver.notificationTemplate = notificationTemplate;
        newNotificationReceiver.receiver = companyUser.user;
        newNotificationReceiver.company = companyUser.company;
        newNotificationReceiver.readStatus = ReadStatus.UNREAD;
        return queryRunner.manager.save(newNotificationReceiver);
      });
      const createdNotificationReceivers = await Promise.all(
        createNotificationReceiver,
      );

      this._realTimeService.pushNotification({
        data: {
          content: content,
          type: infoNotificationType.entity,
          createdAt: new Date().toISOString(),
          readStatus: 'unread',
        },
        notificationReceivers: createdNotificationReceivers,
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async createNotificationType(
    createNotificationTypeDto: CreateNotificationTypeDto,
  ) {
    try {
      let { description, entity, content } = createNotificationTypeDto;
      description = description.replace(/  +/g, ' ').trim();
      const isExist = await this.notificationTypeRepository.findOne({
        where: {
          status: Not(EntityStatus.DELETE),
          content: content,
          entity: entity,
        },
      });
      if (isExist) throw new ConflictException();

      const newNotificationType = new NotificationType();
      newNotificationType.description = description;
      newNotificationType.entity = entity;
      newNotificationType.content = content;

      return await newNotificationType.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getNotificationsOfUser(userId: string, filters) {
    const { _page = 1, _limit = 5, _type = '', _unread } = filters;
    try {
      let infoCompanyUsers = await getManager()
        .createQueryBuilder(CompanyUser, 'companyUser')
        .select('companyUser.id')
        .addSelect('user.id')
        .addSelect('company.id')
        .innerJoin('companyUser.user', 'user')
        .innerJoin('companyUser.company', 'company')
        .andWhere('user.id = :userId and user.status != :status', {
          userId: userId,
          status: EntityStatus.DELETE,
        })
        .andWhere('company.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('companyUser.status != :status', {
          status: EntityStatus.DELETE,
        })
        .getMany();
      //? return error or nothing
      if (infoCompanyUsers.length === 0) return;

      const queryDataNotificationsOfUser = getManager()
        .createQueryBuilder(NotificationReceiver, 'notificationReceiver')
        .innerJoinAndSelect('notificationReceiver.receiver', 'receiver')
        .innerJoinAndSelect(
          'notificationReceiver.notificationTemplate',
          'notificationTemplate',
        )
        .innerJoinAndSelect('notificationReceiver.company', 'company')
        .innerJoinAndSelect(
          'notificationTemplate.notificationType',
          'notificationType',
        )
        .andWhere('receiver.id = :userId', {
          userId: infoCompanyUsers[0].user.id,
        })
        .andWhere('company.id IN (:...companyIds)', {
          companyIds: infoCompanyUsers.map((item) => item.company.id),
        })
        // .orderBy('notificationReceiver.readStatus', 'DESC')
        .addOrderBy('notificationReceiver.creationTime', 'DESC')
        .take(_limit)
        .skip((+_page - 1) * _limit);

      const queryCountNotificationsOfUser = getManager()
        .createQueryBuilder(NotificationReceiver, 'notificationReceiver')
        .innerJoinAndSelect('notificationReceiver.receiver', 'receiver')
        .innerJoinAndSelect(
          'notificationReceiver.notificationTemplate',
          'notificationTemplate',
        )
        .innerJoinAndSelect('notificationReceiver.company', 'company')
        .innerJoinAndSelect(
          'notificationTemplate.notificationType',
          'notificationType',
        )
        .andWhere('receiver.id = :userId', {
          userId: infoCompanyUsers[0].user.id,
        })
        .andWhere('company.id IN (:...companyIds)', {
          companyIds: infoCompanyUsers.map((item) => item.company.id),
        });

      if (_type) {
        queryDataNotificationsOfUser.andWhere(
          'notificationType.entity = :entity',
          { entity: _type },
        );
        queryCountNotificationsOfUser.andWhere(
          'notificationType.entity = :entity',
          { entity: _type },
        );
      }
      if (_unread === 'true') {
        queryDataNotificationsOfUser.andWhere(
          'notificationReceiver.readStatus = :readStatus',
          {
            readStatus: 'unread',
          },
        );
        queryCountNotificationsOfUser.andWhere(
          'notificationReceiver.readStatus = :readStatus',
          {
            readStatus: 'unread',
          },
        );
      }

      const unreadNotificationsOfUser = await getManager()
        .createQueryBuilder(NotificationReceiver, 'notificationReceiver')
        .innerJoinAndSelect('notificationReceiver.receiver', 'receiver')
        .innerJoinAndSelect(
          'notificationReceiver.notificationTemplate',
          'notificationTemplate',
        )
        .innerJoinAndSelect('notificationReceiver.company', 'company')
        .innerJoinAndSelect(
          'notificationTemplate.notificationType',
          'notificationType',
        )
        .andWhere('receiver.id = :userId', {
          userId: infoCompanyUsers[0].user.id,
        })
        .andWhere('company.id IN (:...companyIds)', {
          companyIds: infoCompanyUsers.map((item) => item.company.id),
        })
        .andWhere('notificationReceiver.readStatus = :readStatus', {
          readStatus: 'unread',
        })
        .getCount();

      const data = await queryDataNotificationsOfUser.getMany();

      const prepareData = data.map(async (notification) => {
        let content = '';
        switch (notification.notificationTemplate.notificationType.entity) {
          case EntityName.CLIENT:
            const customer = await this.customerRepository.findOne({
              where: {
                id: notification.notificationTemplate.entityId,
              },
            });
            if (!customer)
              throw new NotFoundException(`Not found ${EntityName.CLIENT}`);

            switch (notification.notificationTemplate.notificationType.id) {
              case NotificationTypeEnum.NEW_CLIENT:
                content =
                  notification.notificationTemplate.notificationType.content
                    .replace(
                      '{client}',
                      formatPhoneNumber(customer?.phoneNumber),
                    )
                    .replace('{company}', notification?.company?.name);
                break;

              case NotificationTypeEnum.NEW_CLIENT_BY_USER:
                const infoCreator =
                  await this.notificationCreatorRepository.findOne({
                    where: {
                      status: Not(EntityStatus.DELETE),
                      notificationTemplate:
                        notification.notificationTemplate.id,
                    },
                    relations: ['creator'],
                  });
                content =
                  notification.notificationTemplate.notificationType.content
                    .replace(
                      '{client}',
                      formatPhoneNumber(customer.phoneNumber),
                    )
                    .replace('{company}', notification?.company?.name)
                    .replace(
                      '{user}',
                      infoCreator?.creator.firstName +
                        ' ' +
                        infoCreator?.creator.lastName,
                    );
                break;

              case NotificationTypeEnum.NEW_CLIENT_BY_SOFTPHONE:
                content =
                  notification.notificationTemplate.notificationType.content
                    .replace(
                      '{client}',
                      formatPhoneNumber(customer.phoneNumber),
                    )
                    .replace('{company}', notification?.company?.name);
                break;

              case NotificationTypeEnum.MISSED_CALL:

              default:
                break;
            }

            return {
              content: content,
              createdAt: notification.creationTime,
              type: notification.notificationTemplate.notificationType.entity,
              id: notification.id,
              readStatus: notification.readStatus,
            };

          case EntityName.MESSAGE:
            const message = await this.messageRepository.findOne({
              where: {
                id: notification.notificationTemplate.entityId,
              },
              relations: [
                'conversation',
                'conversation.companyCustomer',
                'conversation.companyCustomer.customer',
                'attachments',
              ],
            });
            if (!message) throw new NotFoundException('Not found message');

            switch (notification.notificationTemplate.notificationType.id) {
              case NotificationTypeEnum.INBOUND_MESSAGE:
                content =
                  notification.notificationTemplate.notificationType.content
                    .replace(
                      '{client}',
                      formatPhoneNumber(
                        message?.conversation?.companyCustomer?.customer
                          ?.phoneNumber,
                      ),
                    )
                    .replace('{company}', notification?.company?.name)
                    .replace(
                      '{message}',
                      message.text ||
                        message.attachments?.length +
                          (message.attachments?.length < 2
                            ? ' attachment'
                            : ' attachments'),
                    );
                break;

              default:
                break;
            }

            return {
              content: content,
              createdAt: notification.creationTime,
              type: notification.notificationTemplate.notificationType.entity,
              id: notification.id,
              readStatus: notification.readStatus,
            };

          case EntityName.CALL:
            const call: Call = await getManager()
              .getRepository(Call)
              .createQueryBuilder('call')
              .where('call.id = :callId', {
                callId: notification.notificationTemplate.entityId,
              })
              .innerJoinAndSelect('call.message', 'message')
              .innerJoinAndSelect('message.conversation', 'conversation')
              .innerJoinAndSelect(
                'conversation.companyCustomer',
                'companyCustomer',
              )
              .innerJoinAndSelect('companyCustomer.customer', 'customer')
              .getOne();
            switch (notification.notificationTemplate.notificationType.id) {
              case NotificationTypeEnum.MISSED_CALL:
                content =
                  notification.notificationTemplate.notificationType.content
                    .replace(
                      '{type}',
                      call.externalCallStatus === 'Missed'
                        ? 'Missed Call'
                        : call.externalCallStatus,
                    )
                    .replace(
                      '{client}',
                      formatPhoneNumber(
                        call?.message?.conversation?.companyCustomer?.customer
                          ?.phoneNumber,
                      ),
                    )
                    .replace('{company}', notification?.company?.name)
                    .replace(
                      '{duration}',
                      `0${Math.floor(call.duration / 60)}`.slice(-2) +
                        ':' +
                        `0${
                          call.duration - Math.floor(call.duration / 60) * 60
                        }`.slice(-2),
                    );
                return {
                  content: content,
                  createdAt: notification.creationTime,
                  type: notification.notificationTemplate.notificationType
                    .entity,
                  id: notification.id,
                  readStatus: notification.readStatus,
                };
                break;
              default:
                break;
            }
          default:
            break;
        }
      });

      const result = await Promise.all(prepareData);
      return {
        data: result.filter((item) => item !== null),
        unread: unreadNotificationsOfUser,
        pagination: {
          _total: await queryCountNotificationsOfUser.getCount(),
          _page: +_page,
          _limit: _limit,
        },
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  findAll() {
    return `This action returns all notifications`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  }

  async updateNotifications(userId: string, notificationIds) {
    if (notificationIds.length < 1) return { affected: 0 };

    const infoUser = await this.userRepository.find({
      where: {
        status: Not(EntityStatus.DELETE),
        id: userId,
      },
    });
    if (!infoUser) throw new NotFoundException('Not found user');

    try {
      const result: any = notificationIds?.length
        ? await getManager()
            .createQueryBuilder()
            .update(NotificationReceiver)
            .set({ readStatus: 'read' })
            .where('id IN (:...notificationIds) and readStatus = :readStatus', {
              notificationIds: notificationIds,
              readStatus: 'unread',
            })
            .execute()
        : undefined;

      return result?.affected
        ? { affected: result?.affected }
        : { affected: 0 };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }

  async readAllNotifications(userId) {
    const infoUser = await this.userRepository.find({
      where: {
        status: Not(EntityStatus.DELETE),
        id: userId,
      },
    });
    if (!infoUser) throw new NotFoundException('Not found user');

    try {
      const result = await getManager()
        .createQueryBuilder()
        .update(NotificationReceiver)
        .set({ readStatus: 'read' })
        .where('readStatus = :readStatus and receiver.id = :userId', {
          readStatus: 'unread',
          userId,
        })
        .execute();

      return result.affected ? { affected: result.affected } : { affected: 0 };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updateNotification(notificationId, userId, readStatus) {
    const infoUser = await this.userRepository.find({
      where: {
        status: Not(EntityStatus.DELETE),
        id: userId,
      },
    });
    if (!infoUser) throw new NotFoundException('Not found user');

    try {
      const result = await getManager()
        .createQueryBuilder()
        .update(NotificationReceiver)
        .set({ readStatus: readStatus })
        .where('id = :id', {
          id: notificationId,
        })
        .execute();
      return result.affected ? { affected: result.affected } : { affected: 0 };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
