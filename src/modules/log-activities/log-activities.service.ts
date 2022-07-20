import { Injectable } from '@nestjs/common';
import { LogActivity } from './entity/log-activities.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LogActivityRepository } from './repository/log-activities.repository';
import * as _ from 'lodash';
import { Brackets, getManager } from 'typeorm';
import { LogActivityFiltersDto } from './dto/log-activity-filters.dto';
import * as momentTz from 'moment-timezone';
import { UsersService } from '../users/users.service';
import { User } from '../users/entity/user.entity';
import { LogAction } from './enum/log-action.enum';
import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/entity/company.entity';

@Injectable()
export class LogActivitiesService {
  constructor(
    @InjectRepository(LogActivityRepository)
    private readonly logActivityRepository: LogActivityRepository,
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
  ) {}

  async getLogs(filters: LogActivityFiltersDto): Promise<any> {
    const {
      from,
      to,
      userId,
      logAction,
      logType,
      conversationId,
      participantId,
      limit,
      currentItem,
    } = filters;

    try {
      const logActivitiesWithCompany = [
        LogAction.MARK_READ,
        LogAction.MARK_UNREAD,
        LogAction.MARK_NEW,
        LogAction.MARK_EXISTING,
        LogAction.MARK_COMPLETED,
        LogAction.MARK_INCOMPLETE,
        LogAction.SELECT_LABELS,
      ];

      const totalLogActivities = await getManager()
        .createQueryBuilder(LogActivity, 'log_activity')
        .andWhere(`log_activity.creationTime BETWEEN :from AND :to`, {
          from: momentTz(new Date(from))
            .tz('America/Los_Angeles')
            .startOf('day')
            .format(),
          to: momentTz(new Date(to))
            .tz('America/Los_Angeles')
            .endOf('day')
            .format(),
        })
        .andWhere(logAction ? `log_activity.logAction = :logAction` : 'TRUE', {
          logAction: logAction,
        })
        .andWhere(logType ? 'log_activity.logType = :logType' : 'TRUE', {
          logType: logType,
        })
        .andWhere(userId ? `log_activity.userId = :userId` : 'TRUE', {
          userId: userId,
        })
        .andWhere(
          new Brackets((qb) => {
            qb.where(
              conversationId
                ? 'log_activity.newData like :conversationId'
                : 'TRUE',
              {
                conversationId: `%${conversationId}%`,
              },
            ).orWhere(
              participantId
                ? 'log_activity.newData like :participantId'
                : 'TRUE',
              {
                participantId: `%${participantId}%`,
              },
            );
          }),
        )
        .orderBy('log_activity.creationTime', 'DESC')
        .getCount();

      const activitiesLogFilter = await getManager()
        .createQueryBuilder(LogActivity, 'log_activity')
        .andWhere(`log_activity.creationTime BETWEEN :from AND :to`, {
          from: momentTz(new Date(from))
            .tz('America/Los_Angeles')
            .startOf('day')
            .format(),
          to: momentTz(new Date(to))
            .tz('America/Los_Angeles')
            .endOf('day')
            .format(),
        })
        .andWhere(logAction ? `log_activity.logAction = :logAction` : 'TRUE', {
          logAction: logAction,
        })
        .andWhere(logType ? 'log_activity.logType = :logType' : 'TRUE', {
          logType: logType,
        })
        .andWhere(userId ? `log_activity.userId = :userId` : 'TRUE', {
          userId: userId,
        })
        .andWhere(
          new Brackets((qb) => {
            qb.where(
              conversationId
                ? 'log_activity.newData like :conversationId'
                : 'TRUE',
              {
                conversationId: `%${conversationId}%`,
              },
            ).orWhere(
              participantId
                ? 'log_activity.newData like :participantId'
                : 'TRUE',
              {
                participantId: `%${participantId}%`,
              },
            );
          }),
        )
        .orderBy('log_activity.creationTime', 'DESC')
        .skip(currentItem)
        .take(limit)
        .getMany();

      const activitiesLogFullDataPromise = activitiesLogFilter.map(
        async (item: any) => {
          const user: User = await this.usersService.getUser(item.userId);

          let message = item.message?.replace(
            '{_user}',
            `${user.firstName} ${user.lastName} (${user.username})`,
          );

          if (logActivitiesWithCompany.indexOf(item.logAction) !== -1) {
            const requestData = JSON.parse(item.requestData);
            const company: Company = await this.companiesService.getInfoCompany(
              requestData?.companyId,
            );

            message = message.replace('{_company}', `${company?.name}`);

            item.company = JSON.stringify({
              id: company.id,
              phone: company.phone,
              name: company.name,
            });
          }

          item = {
            ...item,
            user: JSON.stringify(user),
            message: message,
          };

          return item;
        },
      );

      const activitiesLogFullData = await Promise.all(
        activitiesLogFullDataPromise,
      );

      return {
        records: activitiesLogFullData || [],
        currentItem: currentItem,
        totalLogActivities: totalLogActivities || 0,
      };
    } catch (error) {
      return error;
    }
  }

  async writeLog(data: any): Promise<any> {
    try {
      const newLog = _.assign(new LogActivity(), data);
      await this.logActivityRepository.save(newLog);
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
