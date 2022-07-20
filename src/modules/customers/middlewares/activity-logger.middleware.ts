/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { extractDataFromRequest } from 'src/common/utils/extractDataFromRequest';
import { JwtCustomService } from 'src/modules/jwt-custom/jwt-custom.service';
import { LogActivityQueueService } from 'src/modules/queues/modules/log-activity-queue/log-activity-queue.service';
import * as _ from 'lodash';
import { HttpMethod } from 'src/modules/log-activities/enum/http-method.enum';
import { LogType } from 'src/modules/log-activities/enum/log-type.enum';
import { LogEntity } from 'src/modules/log-activities/enum/log-entity.enum';
import { LogAction } from 'src/modules/log-activities/enum/log-action.enum';
import { UsersService } from 'src/modules/users/users.service';
import { formatPhoneNumber } from 'src/common/utils/formatPhoneNumber';
import { ConversationsService } from 'src/modules/conversations/conversations.service';
import { EntityStatus } from 'src/common/constant/entity-status';
import { getManager } from 'typeorm';
import { Customer } from '../entity/customer.entity';

@Injectable()
export class ActivityLoggerMiddleware {
  constructor(
    private readonly jwtCustomService: JwtCustomService,
    private readonly logActivityServices: LogActivityQueueService,
    private readonly userServices: UsersService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async use(req: Request, res: Response, next: any) {
    const { path, params, method, token, ip, data } = _.cloneDeep(
      extractDataFromRequest(req),
    );

    if (data) data.customerId = params?.[2];

    const payload: any = this.jwtCustomService.decode(token);
    const userId: string = payload?.id;

    let activityLog: any = {
      ip: _.isArray(ip) ? ip[0] : ip?.slice(ip?.lastIndexOf(':') + 1), //TODO need test ip is array
      userId: userId,
      creationUserId: userId,
      lastModifiedUserId: userId,
      path: path,
      method: HttpMethod[method],
      requestData: data ? JSON.stringify(data) : '{}',
      logType: LogType.UNDEFINED,
      logEntity: LogEntity.UNDEFINED,
      logAction: LogAction.UNDEFINED,
    };

    if (method === 'POST' && _.isString(data?.name)) {
      const conversation =
        await this.conversationsService.getCustomerWithConversationId(
          data?.conversationId,
        );

      const customer = await getManager()
        .createQueryBuilder(Customer, 'customer')
        .where('customer.id = :customerId', {
          customerId: data?.customerId,
        })
        .leftJoinAndSelect(
          'customer.campaignsOfCustomer',
          'campaignsOfCustomer',
        )
        .andWhere('campaignsOfCustomer.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .leftJoinAndSelect('campaignsOfCustomer.campaign', 'campaign')
        .andWhere('campaign.status = :status', { status: EntityStatus.ACTIVE })
        .getOne();

      const campaignsOfCustomer = customer?.campaignsOfCustomer?.length
        ? customer?.campaignsOfCustomer?.map((item) => {
            return {
              id: item?.campaign?.id,
              name: item?.campaign?.name,
            };
          })
        : [];

      activityLog.message = `<b class='message_user'>{_user}</b><p class='message_content'>update name, campaigns for client ${formatPhoneNumber(
        conversation?.companyCustomer?.customer?.phoneNumber,
      )}</p>`;

      activityLog.oldData = JSON.stringify(
        conversation
          ? {
              conversationId: conversation?.id,
              customerId: conversation?.companyCustomer?.customer?.id,
              name: conversation?.companyCustomer?.customer?.fullName,
              campaigns: campaignsOfCustomer || [],
              phoneNumber: formatPhoneNumber(
                conversation?.companyCustomer?.customer?.phoneNumber,
              ),
            }
          : {},
      );

      activityLog.newData = JSON.stringify(
        data
          ? {
              conversationId: data?.conversationId,
              customerId: data?.customerId,
              name: data?.name,
              campaigns:
                data?.campaigns?.length > 0
                  ? data?.campaigns?.map((item: any) => {
                      return {
                        id: item?.value,
                        name: item?.label,
                      };
                    })
                  : [],
              phoneNumber: formatPhoneNumber(
                conversation?.companyCustomer?.customer?.phoneNumber,
              ),
            }
          : {},
      );

      activityLog = {
        ...activityLog,
        logType: LogType.UPDATE,
        logEntity: LogEntity.CUSTOMERS,
        logAction: LogAction.UPDATE_CLIENT,
      };

      await this.logActivityServices.editClientActivity(activityLog);
    }

    next();
  }
}
