import { Injectable } from '@nestjs/common';
import { EntityStatus } from 'src/common/constant/entity-status';
import { MessageDirection } from 'src/common/constant/message-direction';
import { getManager } from 'typeorm';
import { CompanyUser } from '../company-users/entity/company-user.entity';
import { Participant } from '../participants/entity/participant.entity';
import * as mtz from 'moment-timezone';
import { ParticipantRepository } from '../participants/repository/participant.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../messages/entity/message.entity';
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ParticipantRepository)
    private readonly participantRepository: ParticipantRepository,
  ) {}
  private defineRangeTime(
    type = 'today',
    start = mtz.tz('America/Los_Angeles'),
    end = mtz.tz('America/Los_Angeles'),
  ) {
    switch (type) {
      case 'today':
        return {
          startTime: mtz.tz('America/Los_Angeles').startOf('day'),
          endTime: mtz.tz('America/Los_Angeles').endOf('day'),
        };
      case 'lastWeek':
        return {
          startTime: mtz
            .tz('America/Los_Angeles')
            .subtract(1, 'weeks')
            .startOf('isoWeek'),
          endTime: mtz
            .tz('America/Los_Angeles')
            .subtract(1, 'weeks')
            .endOf('isoWeek'),
        };
      case 'lastMonth':
        return {
          startTime: mtz
            .tz('America/Los_Angeles')
            .subtract(1, 'months')
            .startOf('month'),
          endTime: mtz
            .tz('America/Los_Angeles')
            .subtract(1, 'months')
            .endOf('month'),
        };
      case 'range':
        return {
          startTime: mtz.tz(start, 'America/Los_Angeles').startOf('day'),

          endTime: mtz.tz(end, 'America/Los_Angeles').endOf('day'),
        };
      default:
        break;
    }
  }
  async handleGetDashboardInformation(user: any, queries: any) {
    const userId = user.id;
    const { type, start, end } = queries;
    const companiesOfUser = await getManager()
      .createQueryBuilder(CompanyUser, 'companyUser')
      .innerJoinAndSelect('companyUser.company', 'company')
      .innerJoinAndSelect('companyUser.user', 'user')
      .andWhere('company.status =  :status', { status: EntityStatus.ACTIVE })
      .andWhere('companyUser.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('user.id = :userId', { userId: userId })
      .getMany();
    const participants = [];
    for (let i = 0; i < companiesOfUser.length; i++) {
      const participant = await getManager()
        .createQueryBuilder(Participant, 'participant')
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .innerJoinAndSelect('participant.companyUser', 'companyUser')
        .innerJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .where('companyUser.id = :companyUserId', {
          companyUserId: companiesOfUser[i].id,
        })
        .getMany();
      participants.push(...participant);
    }
    const { startTime, endTime } = this.defineRangeTime(type, start, end);
    let numberOfNotReplyYetMessages = 0;
    let numberOfNotReadYetMessages = 0;
    const lastInboundMessages = [];
    if (participants.length > 0) {
      for (let i = 0; i < participants.length; i++) {
        // const data = await getManager()
        //   .createQueryBuilder(Participant, 'participant')
        //   .innerJoinAndSelect('participant.conversation', 'conversation')
        //   .innerJoinAndSelect('conversation.lastMessage', 'lastMessage')
        //   .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
        //   .innerJoinAndSelect('companyCustomer.customer', 'customer')
        //   .andWhere('lastMessage.direction = :direction', {
        //     direction: MessageDirection.INBOUND,
        //   })
        //   .andWhere(
        //     'lastMessage.creationTime BETWEEN :startTime and :endTime',
        //     {
        //       startTime,
        //       endTime,
        //     },
        //   )
        //   .andWhere('customer.status = :status', {
        //     status: EntityStatus.ACTIVE,
        //   })
        //   .andWhere('participant.id = :participantId', {
        //     participantId: participants[i].id,
        //   })
        //   .andWhere('conversation.id = :conversationId', {
        //     conversationId: participants[i].conversation.id,
        //   })
        //   .getOne();
        // if (data) {
        //   lastInboundMessages.push(data);
        // }
        const participantsIndex = participants[i];
        if (
          participantsIndex.conversation.lastMessage.direction ===
            MessageDirection.INBOUND &&
          participantsIndex.conversation.companyCustomer.customer.status ===
            EntityStatus.ACTIVE &&
          participantsIndex.conversation.lastMessage.creationTime > startTime &&
          participantsIndex.conversation.lastMessage.creationTime < endTime
        ) {
          lastInboundMessages.push(participantsIndex);
        }
      }
      numberOfNotReadYetMessages = lastInboundMessages.filter(
        (item) => item.readStatus === 'unread',
      ).length;

      numberOfNotReplyYetMessages = lastInboundMessages.length;

      const conversationIds = participants
        .map((item) => item?.conversation?.id)
        .filter((item) => item);
      const inboundMessages =
        conversationIds.length > 0
          ? await getManager()
              .createQueryBuilder(Message, 'message')
              .innerJoinAndSelect('message.conversation', 'conversation')
              .andWhere('conversation.id IN (:...conversationIds)', {
                conversationIds: conversationIds,
              })
              .andWhere('message.direction = :direction', {
                direction: MessageDirection.INBOUND,
              })
              .andWhere(
                'message.creationTime BETWEEN :startTime and :endTime',
                {
                  startTime,
                  endTime,
                },
              )
              .getMany()
          : [];
      const outboundMessages =
        conversationIds.length > 0
          ? await getManager()
              .createQueryBuilder(Message, 'message')
              .innerJoinAndSelect('message.conversation', 'conversation')
              .andWhere('conversation.id IN (:...conversationIds)', {
                conversationIds: conversationIds,
              })
              .andWhere('message.direction = :direction', {
                direction: MessageDirection.OUTBOUND,
              })
              .andWhere(
                'message.creationTime BETWEEN :startTime and :endTime',
                {
                  startTime,
                  endTime,
                },
              )
              .getMany()
          : [];
      //*Handle get Bar Chart data
      const barChartData = [];
      for (let i = 0; i < companiesOfUser.length; i++) {
        let numberOfOutboundMessages = 0;
        let numberOfInboundMessages = 0;
        numberOfOutboundMessages = outboundMessages.filter(
          (item) => item.companyCode === companiesOfUser[i].company.code,
        ).length;
        numberOfInboundMessages = inboundMessages.filter(
          (item) => item.companyCode === companiesOfUser[i].company.code,
        ).length;
        barChartData.push({
          name: companiesOfUser[i].company.name,
          Outbound: numberOfOutboundMessages,
          Inbound: numberOfInboundMessages,
        });
      }
      //* Handle Pie chart
      const customerForPieChart = lastInboundMessages.map(
        (item) => item.conversation.companyCustomer.customer,
      );

      let newCustomerNumber = 0;
      let oldCustomerNumber = 0;
      for (let i = 0; i < customerForPieChart.length; i++) {
        if (customerForPieChart[i].creationTime < startTime) {
          oldCustomerNumber++;
        } else {
          newCustomerNumber++;
        }
      }
      const pieChartData = [
        {
          name: 'New Clients',
          value: Number(
            Number(
              (newCustomerNumber * 100) /
                (newCustomerNumber + oldCustomerNumber),
            ).toFixed(2),
          ),
        },
        {
          name: 'Old Clients',
          value: Number(
            Number(
              100 -
                (newCustomerNumber * 100) /
                  (newCustomerNumber + oldCustomerNumber),
            ).toFixed(2),
          ),
        },
      ];
      return {
        numberOfInboundMessages: inboundMessages.length,
        numberOfOutboundMessages: outboundMessages.length,
        numberOfNotReplyYetMessages,
        numberOfNotReadYetMessages,
        barChart: barChartData,
        pieChart: pieChartData,
      };
    }
    return {
      numberOfInboundMessages: 0,
      numberOfOutboundMessages: 0,
      numberOfNotReplyYetMessages: 0,
      numberOfNotReadYetMessages: 0,
      barChart: [],
      pieChart: [],
    };
  }

  async getLastContactCustomers({ user, limitItem = 5, currentItems = 0 }) {
    const lastInboundMessages = [];
    const userId = user.id;
    const startTime = mtz.tz('America/Los_Angeles').startOf('day');
    const endTime = mtz.tz('America/Los_Angeles').endOf('day');
    const companiesOfUser = await getManager()
      .createQueryBuilder(CompanyUser, 'companyUser')
      .innerJoinAndSelect('companyUser.company', 'company')
      .innerJoinAndSelect('companyUser.user', 'user')
      .andWhere('company.status =  :status', { status: EntityStatus.ACTIVE })
      .andWhere('companyUser.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('user.id = :userId', { userId: userId })
      .getMany();

    const participants = [];
    for (let i = 0; i < companiesOfUser.length; i++) {
      // const participant = await this.participantRepository.find({
      //   relations: ['conversation', 'companyUser'],
      //   where: {
      //     companyUser: companiesOfUser[i].id,
      //   },
      // });
      // participants.push(...participant);
      const participant = await getManager()
        .createQueryBuilder(Participant, 'participant')
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .innerJoinAndSelect('participant.companyUser', 'companyUser')
        .innerJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .leftJoinAndSelect('lastMessage.attachments', 'attachments')
        .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .where('companyUser.id = :companyUserId', {
          companyUserId: companiesOfUser[i].id,
        })
        .getMany();
      participants.push(...participant);
    }
    for (let i = 0; i < participants.length; i++) {
      // const data = await getManager()
      //   .createQueryBuilder(Participant, 'participant')
      //   .innerJoinAndSelect('participant.conversation', 'conversation')
      //   .innerJoinAndSelect('conversation.lastMessage', 'lastMessage')
      //   .leftJoinAndSelect('lastMessage.attachments', 'attachments')
      //   .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      //   .innerJoinAndSelect('companyCustomer.company', 'company')
      //   .innerJoinAndSelect('companyCustomer.customer', 'customer')
      //   .andWhere('lastMessage.direction = :direction', {
      //     direction: MessageDirection.INBOUND,
      //   })
      //   .andWhere('participant.id = :participantId', {
      //     participantId: participants[i].id,
      //   })
      //   .andWhere('conversation.id = :conversationId', {
      //     conversationId: participants[i].conversation.id,
      //   })
      //   .andWhere('lastMessage.creationTime BETWEEN :startTime and :endTime', {
      //     startTime,
      //     endTime,
      //   })
      //   .getOne();
      // if (data) {
      //   lastInboundMessages.push(data);
      // }
      const participantsIndex = participants[i];
      if (
        participantsIndex.conversation.lastMessage.direction ===
          MessageDirection.INBOUND &&
        participantsIndex.conversation.companyCustomer.customer.status ===
          EntityStatus.ACTIVE &&
        participantsIndex.conversation.lastMessage.creationTime > startTime &&
        participantsIndex.conversation.lastMessage.creationTime < endTime
      ) {
        lastInboundMessages.push(participantsIndex);
      }
    }
    const data = lastInboundMessages.map((item) => ({
      customer: item.conversation.companyCustomer.customer,
      message: {
        ...item.conversation.lastMessage,
        attachments: item.conversation.lastMessage.attachments.length,
      },
      company: item.conversation.companyCustomer.company.name,
    }));
    const offset =
      currentItems + +limitItem < data.length
        ? currentItems + +limitItem
        : data.length;
    return {
      data: data
        .sort((a, b) => {
          if (
            new Date(a.message.creationTime) < new Date(b.message.creationTime)
          )
            return 1;
          else if (
            new Date(a.message.creationTime) > new Date(b.message.creationTime)
          )
            return -1;
          return 0;
        })
        .slice(currentItems, offset),
      pagination: {
        total: data.length,
      },
    };
  }
}
