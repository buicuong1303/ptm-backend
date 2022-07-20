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
import { ConversationsService } from '../conversations.service';
import { formatPhoneNumber } from 'src/common/utils/formatPhoneNumber';
import { LabelsService } from 'src/modules/labels/labels.service';
import { getManager } from 'typeorm';
import { Conversation } from 'src/modules/conversations/entity/conversation.entity';
import { EntityStatus } from 'src/common/constant/entity-status';

@Injectable()
export class ActivityLoggerMiddleware {
  constructor(
    private readonly jwtCustomService: JwtCustomService,
    private readonly logActivityServices: LogActivityQueueService,
    private readonly conversationsService: ConversationsService,
    private readonly labelsService: LabelsService,
  ) {}

  async use(req: Request, res: Response, next: any) {
    const { path, params, method, token, ip, data } = _.cloneDeep(
      extractDataFromRequest(req),
    );

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (data && uuidRegex.test(params[2])) data.conversationId = params?.[2];
    else {
      data.conversationIds = data.ids;
      delete data.ids;
    }

    const conversation = await getManager()
      .createQueryBuilder(Conversation, 'conversation')
      .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
      .leftJoinAndSelect('companyCustomer.company', 'company')
      .andWhere(
        'conversation.id = :conversationId and conversation.status = :status',
        {
          conversationId: data?.conversationId || data.conversationIds[0],
          status: EntityStatus.ACTIVE,
        },
      )
      .getOne();
    const company = conversation?.companyCustomer?.company;

    const payload: any = this.jwtCustomService.decode(token);
    const userId: string = payload?.id;

    let activityLog: any = {
      ip: _.isArray(ip) ? ip[0] : ip?.slice(ip?.lastIndexOf(':') + 1), //TODO need test ip is array
      userId: userId,
      creationUserId: userId,
      lastModifiedUserId: userId,
      path: path,
      method: HttpMethod[method],
      requestData: data
        ? JSON.stringify({ ...data, companyId: company.id })
        : `{companyId: ${company.id}}`,
      oldData: data ? JSON.stringify(data) : '{}',
      newData: data ? JSON.stringify(data) : '{}',
      logType: LogType.UNDEFINED,
      logEntity: LogEntity.UNDEFINED,
      logAction: LogAction.UNDEFINED,
    };

    if (method === 'PUT' && _.isArray(data?.labels)) {
      const conversation =
        await this.conversationsService.getCustomerWithConversationId(
          data?.conversationId,
        );

      const oldLabels = await this.labelsService.getLabelsWithIds(
        conversation?.labels || [],
      );
      const newLabels = await this.labelsService.getLabelsWithIds(
        data?.labels || [],
      );

      activityLog.message = `<b class='message_user'>{_user}</b><p class='message_content'>select labels for conversation ${formatPhoneNumber(
        conversation?.companyCustomer?.customer?.phoneNumber,
      )}</p><p class='message_company'>{_company}</p>`;

      activityLog.oldData = JSON.stringify(
        conversation
          ? {
              conversationId: conversation.id,
              labels: _.cloneDeep(oldLabels).map((item: any) => {
                return {
                  id: item.id,
                  title: item.title,
                };
              }),
              phoneNumber: formatPhoneNumber(
                conversation?.companyCustomer?.customer?.phoneNumber,
              ),
            }
          : {},
      );

      activityLog.newData = JSON.stringify(
        data
          ? {
              conversationId: data.conversationId,
              labels: _.cloneDeep(newLabels).map((item: any) => {
                return {
                  id: item.id,
                  title: item.title,
                };
              }),
              phoneNumber: formatPhoneNumber(
                conversation?.companyCustomer?.customer?.phoneNumber,
              ),
            }
          : {},
      );

      activityLog = {
        ...activityLog,
        logType: LogType.UPDATE,
        logEntity: LogEntity.CONVERSATIONS,
        logAction: LogAction.SELECT_LABELS,
      };

      await this.logActivityServices.assignLabelActivity(activityLog);
    }

    if (
      (method === 'PATCH' || method === 'PATCH') &&
      (_.isBoolean(data?.isCompleted) || _.isString(data?.newOrExisting))
    ) {
      if (data.conversationId) {
        const conversation =
          await this.conversationsService.getCustomerWithConversationId(
            data?.conversationId,
          );

        if (data.isCompleted === true || data.isCompleted === false) {
          activityLog.logAction =
            data.isCompleted === true
              ? LogAction.MARK_COMPLETED
              : LogAction.MARK_INCOMPLETE;

          activityLog.message = `<b class='message_user'>{_user}</b><p class='message_content'>mark as ${
            data.isCompleted ? 'completed' : 'incomplete'
          } for conversation ${formatPhoneNumber(
            conversation?.companyCustomer?.customer?.phoneNumber,
          )}</p><p class='message_company'>{_company}</p>`;

          activityLog.oldData = JSON.stringify(
            conversation
              ? {
                  isCompleted: conversation.isCompleted,
                  conversationId: conversation.id,
                  phoneNumber: formatPhoneNumber(
                    conversation?.companyCustomer?.customer?.phoneNumber,
                  ),
                }
              : {},
          );
        } else if (
          data.newOrExisting === 'new' ||
          data.newOrExisting === 'existing'
        ) {
          activityLog.logAction =
            data.newOrExisting === 'new'
              ? LogAction.MARK_NEW
              : LogAction.MARK_EXISTING;

          activityLog.message = `<b class='message_user'>{_user}</b><p class='message_content'>mark as ${
            data.newOrExisting
          } for conversation ${formatPhoneNumber(
            conversation?.companyCustomer?.customer?.phoneNumber,
          )}</p><p class='message_company'>{_company}</p>`;

          activityLog.oldData = JSON.stringify(
            conversation
              ? {
                  newOrExisting: conversation.newOrExisting,
                  conversationId: conversation.id,
                  phoneNumber: formatPhoneNumber(
                    conversation?.companyCustomer?.customer?.phoneNumber,
                  ),
                }
              : {},
          );
        } else {
          activityLog.logAction = LogAction.UNDEFINED;
          activityLog.message = '';
          activityLog.oldData = JSON.stringify({});
        }

        activityLog = {
          ...activityLog,
          logType: LogType.UPDATE,
          logEntity: LogEntity.CONVERSATIONS,
          newData: JSON.stringify(
            data
              ? {
                  ...data,
                  phoneNumber: formatPhoneNumber(
                    conversation?.companyCustomer?.customer?.phoneNumber,
                  ),
                }
              : {},
          ),
        };
      }

      if (data.conversationIds) {
        const conversationPromises =
          data?.conversationIds?.length > 0
            ? data?.conversationIds?.map((item: any) => {
                return this.conversationsService.getCustomerWithConversationId(
                  item,
                );
              })
            : [];

        const conversations = await Promise.all(conversationPromises);

        if (data.isCompleted === true || data.isCompleted === false) {
          activityLog.logAction = data.isCompleted
            ? LogAction.MARK_COMPLETED
            : LogAction.MARK_INCOMPLETE;

          activityLog.message = `<b class='message_user'>{_user}</b><p class='message_content'>mark as ${
            data.isCompleted ? 'completed' : 'incomplete'
          } for conversations ${_.cloneDeep(conversations)?.map((item: any) => {
            return ` ${formatPhoneNumber(
              item?.companyCustomer?.customer?.phoneNumber,
            )}`;
          })}</p><p class='message_company'>{_company}</p>`;

          activityLog.oldData = JSON.stringify(
            conversations?.length > 0
              ? _.cloneDeep(conversations)?.map((item: any) => {
                  return {
                    conversationId: item.id,
                    isCompleted: item.isCompleted,
                    phoneNumber: formatPhoneNumber(
                      item?.companyCustomer?.customer?.phoneNumber,
                    ),
                  };
                })
              : {},
          );

          activityLog.newData = JSON.stringify(
            conversations?.length > 0
              ? _.cloneDeep(conversations)?.map((item: any) => {
                  return {
                    conversationId: item.id,
                    isCompleted: data.isCompleted,
                    phoneNumber: formatPhoneNumber(
                      item?.companyCustomer?.customer?.phoneNumber,
                    ),
                  };
                })
              : {},
          );
        } else if (
          data.newOrExisting === 'new' ||
          data.newOrExisting === 'existing'
        ) {
          activityLog.logAction =
            data.newOrExisting === 'new'
              ? LogAction.MARK_NEW
              : LogAction.MARK_EXISTING;

          activityLog.message = `<b class='message_user'>{_user}</b><p class='message_content'>mark as ${
            data.newOrExisting
          } for conversations ${_.cloneDeep(conversations)?.map((item: any) => {
            return ` ${formatPhoneNumber(
              item?.companyCustomer?.customer?.phoneNumber,
            )}`;
          })}</p><p class='message_company'>{_company}</p>`;

          activityLog.oldData = JSON.stringify(
            conversations?.length > 0
              ? _.cloneDeep(conversations)?.map((item: any) => {
                  return {
                    conversationId: item.id,
                    newOrExisting: item.newOrExisting,
                    phoneNumber: formatPhoneNumber(
                      item?.companyCustomer?.customer?.phoneNumber,
                    ),
                  };
                })
              : {},
          );

          activityLog.newData = JSON.stringify(
            conversations?.length > 0
              ? _.cloneDeep(conversations)?.map((item: any) => {
                  return {
                    conversationId: item.id,
                    newOrExisting: data.newOrExisting,
                    phoneNumber: formatPhoneNumber(
                      item?.companyCustomer?.customer?.phoneNumber,
                    ),
                  };
                })
              : {},
          );
        } else {
          activityLog.logAction = LogAction.UNDEFINED;
          activityLog.message = '';
          activityLog.oldData = JSON.stringify({});
          activityLog.newData = JSON.stringify({});
        }

        activityLog = {
          ...activityLog,
          logType: LogType.UPDATE,
          logEntity: LogEntity.CONVERSATIONS,
        };
      }

      await this.logActivityServices.updateConversationActivity(activityLog);
    }

    next();
  }
}
