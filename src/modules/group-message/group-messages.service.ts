import { CompanyRepository } from './../companies/repository/company.repository';
import { delay } from './../../common/utils/delay';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupMessageRepository } from './repository/group-message.repository';
import { GroupMessage } from './entity/group-message.entity';
import { CreateGroupMessageDto } from './dto/create-group-message.dto';
import { EntityManager, Brackets } from 'typeorm';
import { Company } from '../companies/entity/company.entity';
import * as _ from 'lodash';
import { transformSearchPhoneNumber } from '../../common/utils/transformSearchPhoneNumber';
@Injectable()
export class GroupMessagesService {
  private _logger: Logger = new Logger(GroupMessagesService.name);

  constructor(
    @InjectRepository(GroupMessageRepository)
    private readonly groupMessageRepository: GroupMessageRepository,

    @InjectRepository(CompanyRepository)
    private readonly companyRepository: CompanyRepository,
  ) {}

  public async createGroupMessage(
    createGroupMessageData: CreateGroupMessageDto,
    entityManager: EntityManager,
  ): Promise<GroupMessage> {
    const company = await this.companyRepository.findOne({
      where: {
        phone: createGroupMessageData.to,
        status: EntityStatus.ACTIVE,
      },
    });

    if (!company) {
      this._logger.error(
        'Not found company in createGroupMessage: ' +
          JSON.stringify(createGroupMessageData),
      );

      return;
    }

    const messageGroup = new GroupMessage();
    messageGroup.from = createGroupMessageData.from;
    messageGroup.to = createGroupMessageData.to;
    messageGroup.text = createGroupMessageData.text;
    messageGroup.nonTargets = createGroupMessageData.nonTargets.join('; ');
    messageGroup.exId = createGroupMessageData.exId;
    messageGroup.exCreationTime = createGroupMessageData.exCreationTime;
    messageGroup.exLastModifiedTime = createGroupMessageData.exLastModifiedTime;
    messageGroup.exStatus = createGroupMessageData.exStatus;
    messageGroup.direction = createGroupMessageData.direction;

    return entityManager.save(messageGroup);
  }

  //* only cover for inbound message
  public async getGroupMessages(
    page: number,
    pageSize: number,
    searchQuery = '',
    current: number,
    isReload?: boolean,
  ): Promise<any> {
    const query = await this.groupMessageRepository
      .createQueryBuilder('groupMessage')
      .where('groupMessage.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere(
        new Brackets((qb) => {
          qb.where('groupMessage.text ILIKE :searchQueryText', {
            searchQueryText: `%${searchQuery}%`,
          });

          if (/\d/.test(searchQuery)) {
            qb.orWhere('groupMessage.from ILIKE :searchQueryFrom', {
              searchQueryFrom: `%${transformSearchPhoneNumber(searchQuery)}%`,
            })
              .orWhere('groupMessage.to ILIKE :searchQueryTo', {
                searchQueryTo: `%${transformSearchPhoneNumber(searchQuery)}%`,
              })
              .orWhere('groupMessage.nonTargets ILIKE :searchQueryNTG', {
                searchQueryNTG: `%${transformSearchPhoneNumber(searchQuery)}%`,
              });
          }
        }),
      )
      .orderBy('groupMessage.creationTime', 'DESC')
      .leftJoinAndSelect('groupMessage.attachments', 'attachments')
      .leftJoinAndMapOne(
        'groupMessage.to',
        Company,
        'company',
        'company.phone = groupMessage.to',
      );

    if (page && pageSize) {
      //* only for polling using with lazy load
      if (isReload) {
        query.take(current);
      } else {
        query.skip(current).take(pageSize);
      }
    }

    const [list, total] = await query.getManyAndCount();
    const returnList = list.map((item) => {
      return _.omit(
        {
          ...item,
          company: _.pick(item.to, ['id', 'name', 'code', 'phone', 'status']),
        },
        ['to'],
      );
    });

    return {
      list: returnList,
      current: isReload ? current : current + list.length,
      total,
      page: page ?? 1,
      pageSize: pageSize ?? total,
    };
  }
}
