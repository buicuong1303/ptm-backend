import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { MessageDirection } from 'src/common/constant/message-direction';
import { OptStatus } from 'src/common/constant/opt-status';
import { transformSearchPhoneNumber } from 'src/common/utils/transformSearchPhoneNumber';
import { getManager } from 'typeorm';
import { Message } from '../messages/entity/message.entity';
import { MessageRepository } from '../messages/repository/message.repository';
import { OptSuggestionsService } from '../opt-suggestions/opt-suggestions.service';
import { SensitiveDetect } from './entity/sensitive-detects.entity';
import { SensitiveDetectsRepository } from './repository/sensitive-detects.repository';
import * as mtz from 'moment-timezone';
@Injectable()
export class SensitiveDetectsService {
  constructor(
    @InjectRepository(SensitiveDetectsRepository)
    private readonly sensitiveDetectsRepository: SensitiveDetectsRepository,
    private readonly messageRepository: MessageRepository,
    private readonly optSuggestionService: OptSuggestionsService,
  ) {}

  async createSensitiveDetect(createSensitiveDto: any, user?: any) {
    const message = await this.messageRepository.findOne({
      where: {
        id: createSensitiveDto.messageId,
      },
    });

    if (!message) throw new NotFoundException('Not found message ');

    const isExistSensitiveWord = await this.sensitiveDetectsRepository.findOne({
      where: {
        message: message.id,
      },
    });

    if (isExistSensitiveWord) {
      return {
        success: false,
        message: 'Sensitive word has been exist',
      };
    }

    const sensitiveDetect = new SensitiveDetect();
    sensitiveDetect.reason = createSensitiveDto.reason;
    sensitiveDetect.message = message;
    sensitiveDetect.creationUserId = user?.id;
    sensitiveDetect.lastModifiedUserId = user?.id;

    return {
      success: true,
      data: await sensitiveDetect.save(),
    };
  }

  async updateSensitiveDetect(updateSensitiveDto: any, id: string, user: any) {
    const sensitive = await this.sensitiveDetectsRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    sensitive.reason = updateSensitiveDto.reason;
    sensitive.lastModifiedUserId = user?.id;
    return await sensitive.save();
  }

  async deleteSensitiveDetect(id: string, user: any) {
    const sensitive = await this.sensitiveDetectsRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    sensitive.status = EntityStatus.DELETE;
    sensitive.lastModifiedUserId = user?.id;
    return await sensitive.save();
  }

  async searchSensitiveDetect(filters) {
    const { _page, _limit, value } = filters;
    const sensitiveDetects = await getManager()
      .createQueryBuilder(SensitiveDetect, 'sensitiveDetect')
      .leftJoinAndSelect('sensitiveDetect.message', 'message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('message.lastModifiedUserId', 'lastModifiedUser')
      .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      .innerJoinAndSelect('companyCustomer.customer', 'customer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .orderBy('sensitiveDetect.creationTime', 'DESC')
      .getMany();
    const results = sensitiveDetects.filter((item) => {
      if (
        item.message.conversation.companyCustomer.company.name
          .toLowerCase()
          .indexOf(value.toLowerCase()) !== -1 ||
        transformSearchPhoneNumber(
          item.message.conversation.companyCustomer.customer.phoneNumber,
        ).indexOf(transformSearchPhoneNumber(value.toLowerCase())) > 0 ||
        (item.message.lastModifiedUserId &&
          `${item.message.lastModifiedUserId.firstName} ${item.message.lastModifiedUserId.lastName}`
            .toLowerCase()
            .indexOf(value.toLowerCase()) !== -1) ||
        item.message.text.toLowerCase().indexOf(value.trim().toLowerCase()) !==
          -1 ||
        item.reason.toLowerCase().indexOf(value.toLowerCase()) !== -1
      ) {
        return true;
      } else {
        return false;
      }
    });
    const resultsSlice = results.slice(
      _limit * (_page - 1),
      _limit * (_page - 1) + _limit,
    );
    return {
      pagination: {
        _limit: _limit,
        _page: +_page,
        _total: results.length,
      },
      data: resultsSlice,
    };
    // return resultsSlice;
  }

  async getSensitiveDetects(filters) {
    const { _page, _limit } = filters;
    const sensitiveDetects = await getManager()
      .createQueryBuilder(SensitiveDetect, 'sensitiveDetect')
      .leftJoinAndSelect('sensitiveDetect.message', 'message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('message.lastModifiedUserId', 'lastModifiedUser')
      .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      .innerJoinAndSelect('companyCustomer.customer', 'customer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .take(_limit)
      .skip((+_page - 1) * _limit)
      .orderBy('sensitiveDetect.creationTime', 'DESC')
      .getMany();
    const countSensitiveDetects = await getManager()
      .createQueryBuilder(SensitiveDetect, 'sensitiveDetect')
      .leftJoinAndSelect('sensitiveDetect.message', 'message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('message.lastModifiedUserId', 'lastModifiedUser')
      .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      .innerJoinAndSelect('companyCustomer.customer', 'customer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .orderBy('sensitiveDetect.creationTime', 'DESC')
      .getCount();
    return {
      pagination: {
        _limit: _limit,
        _page: +_page,
        _total: countSensitiveDetects,
      },
      data: sensitiveDetects,
    };
  }

  async getAllDataExport() {
    const sensitiveDetects = await getManager()
      .createQueryBuilder(SensitiveDetect, 'sensitiveDetect')
      .leftJoinAndSelect('sensitiveDetect.message', 'message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('message.lastModifiedUserId', 'lastModifiedUser')
      .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      .innerJoinAndSelect('companyCustomer.customer', 'customer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .orderBy('sensitiveDetect.creationTime', 'DESC')
      .getMany();
    return sensitiveDetects;
  }

  async getSensitiveDetectsById(id: string) {
    const sensitiveDetect = await this.sensitiveDetectsRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    return sensitiveDetect;
  }
  async detectOptOut(data: any) {
    const infoMessage = await this.messageRepository.findOne({
      where: {
        id: data.id,
      },
      relations: ['conversation'],
    });
    const infoLastMessageOutbound = await getManager()
      .createQueryBuilder(Message, 'message')
      .innerJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('message.campaign', 'campaign')
      .andWhere(
        'message.direction = :direction and conversation.id = :conversationId',
        {
          direction: MessageDirection.OUTBOUND,
          conversationId: infoMessage.conversation.id,
        },
      )
      .andWhere('message.creationTime BETWEEN :startTime and :endTime', {
        startTime: mtz.tz('America/Los_Angeles').subtract(7, 'days'),
        endTime: mtz.tz('America/Los_Angeles'),
      })
      .andWhere('message.isPolling = :isPolling', { isPolling: false })
      .andWhere('message.index < :index', { index: infoMessage.index })
      .orderBy('message.index', 'DESC')
      .getOne();
    if (infoLastMessageOutbound && infoLastMessageOutbound.campaign) {
      this.optSuggestionService.createOptSuggestion({
        messageId: data.id,
        rate: data.rate,
        campaignId: infoLastMessageOutbound.campaign.id,
        optStatus: OptStatus.OUT,
        reason: data.text,
      });
    } else {
      this.optSuggestionService.createOptSuggestion({
        messageId: data.id,
        rate: data.rate,
        optStatus: OptStatus.OUT,
        reason: data.text,
      });
    }
  }
}
