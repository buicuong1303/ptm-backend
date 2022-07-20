import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';
import { Conversation } from '../conversations/entity/conversation.entity';
import { Message } from '../messages/entity/message.entity';
import * as mtz from 'moment-timezone';
import { GetHistoryDto } from './dto/get-history.dto';
import { EntityStatus } from 'src/common/constant/entity-status';

@Injectable()
export class ViewHistoryService {
  async getHistory(getResponseDto: GetHistoryDto) {
    if (getResponseDto.phones.length === 0) return;
    const startDate = getResponseDto.startDate
      ? mtz.tz(
          getResponseDto.startDate,
          'YYYY-MM-DDTHH:mm:ss.000Z',
          'America/Los_Angeles',
        )
      : mtz.tz('America/Los_Angeles');
    const endDate = getResponseDto.endDate
      ? mtz.tz(
          getResponseDto.endDate,
          'YYYY-MM-DDTHH:mm:ss.000Z',
          'America/Los_Angeles',
        )
      : mtz.tz('America/Los_Angeles');

    const conversations = await getManager()
      .createQueryBuilder(Conversation, 'conversation')
      .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      .innerJoinAndSelect('companyCustomer.customer', 'customer')
      .innerJoinAndSelect('companyCustomer.company', 'company')
      .andWhere('company.id = :companyId', {
        companyId: getResponseDto.companyId,
      })
      .andWhere('customer.phoneNumber IN (:...listPhones)', {
        listPhones: getResponseDto.phones,
      })
      .andWhere('companyCustomer.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('customer.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('company.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .getMany();

    const messagesInConversation = conversations.map(async (conversation) => {
      const messages = await getManager()
        .createQueryBuilder(Message, 'message')
        .leftJoinAndSelect('message.attachments', 'attachments')
        .innerJoinAndSelect('message.conversation', 'conversation')
        .leftJoinAndSelect('message.call', 'call')
        .andWhere('conversation.id = :conversationId', {
          conversationId: conversation.id,
        })
        .andWhere('message.creationTime BETWEEN :startDate and :endDate', {
          startDate,
          endDate,
        })
        .orderBy('message.index', 'ASC')
        .getMany();
      return {
        customer: conversation.companyCustomer.customer,
        company: conversation.companyCustomer.company,
        messages: messages,
      };
    });

    return await Promise.all(messagesInConversation);
  }
}
