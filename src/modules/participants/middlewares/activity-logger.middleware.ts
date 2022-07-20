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
import { ParticipantRepository } from '../repository/participant.repository';
import { EntityStatus } from 'src/common/constant/entity-status';
import { formatPhoneNumber } from 'src/common/utils/formatPhoneNumber';
import { Participant } from 'src/modules/participants/entity/participant.entity';
import { getManager } from 'typeorm';

@Injectable()
export class ActivityLoggerMiddleware {
  constructor(
    private readonly jwtCustomService: JwtCustomService,
    private readonly logActivityServices: LogActivityQueueService,
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async use(req: Request, res: Response, next: any) {
    const { path, params, method, token, ip, data } = _.cloneDeep(
      extractDataFromRequest(req),
    );

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (data && uuidRegex.test(params[2])) data.participantId = params?.[2];

    const participant = await getManager()
      .createQueryBuilder(Participant, 'participant')
      .innerJoinAndSelect('participant.companyUser', 'companyUser')
      .leftJoinAndSelect('companyUser.company', 'company')
      .andWhere(
        'participant.id = :participantId and participant.status = :status',
        {
          participantId: data?.participantId,
          status: EntityStatus.ACTIVE,
        },
      )
      .getOne();
    const company = participant?.companyUser?.company;

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
      logType: LogType.UNDEFINED,
      logEntity: LogEntity.UNDEFINED,
      logAction: LogAction.UNDEFINED,
    };

    if (
      (method === 'PATCH' || method === 'POST') &&
      _.isString(data?.readStatus)
    ) {
      if (data?.participantId) {
        const participant = await this.participantRepository.findOne({
          where: {
            id: data?.participantId,
            status: EntityStatus.ACTIVE,
          },
          relations: [
            'conversation',
            'conversation.companyCustomer',
            'conversation.companyCustomer.customer',
          ],
        });

        activityLog.message = `<b class='message_user'>{_user}</b> <p class='message_content'>mark as ${
          data?.readStatus
        } for conversation ${formatPhoneNumber(
          participant?.conversation?.companyCustomer?.customer?.phoneNumber,
        )}</p> <p class='message_company'>{_company}</p>`;

        activityLog.oldData = JSON.stringify(
          participant
            ? {
                readStatus: participant.readStatus,
                participantId: participant.id,
                phoneNumber: formatPhoneNumber(
                  participant.conversation?.companyCustomer?.customer
                    ?.phoneNumber,
                ),
              }
            : {},
        );

        activityLog.newData = JSON.stringify(
          data
            ? {
                ...data,
                phoneNumber: formatPhoneNumber(
                  participant.conversation?.companyCustomer?.customer
                    ?.phoneNumber,
                ),
              }
            : {},
        );
      }

      if (data?.participantIds) {
        const participantPromises = data?.participantIds?.map(
          (item: string) => {
            return this.participantRepository.findOne({
              where: {
                id: item,
                status: EntityStatus.ACTIVE,
              },
              relations: [
                'conversation',
                'conversation.companyCustomer',
                'conversation.companyCustomer.customer',
              ],
            });
          },
        );
        const participants = await Promise.all(participantPromises);

        activityLog.message = `<b class='message_user'>{_user}</b> <p class='message_content'>mark as ${
          data?.readStatus
        } for conversations ${_.cloneDeep(participants)?.map((item: any) => {
          return ` ${formatPhoneNumber(
            item?.conversation?.companyCustomer?.customer?.phoneNumber,
          )}`;
        })}</p> <p class='message_company'>{_company}</p>`;

        activityLog.oldData = JSON.stringify(
          participants?.length > 0
            ? _.cloneDeep(participants)?.map((item: any) => {
                return {
                  participantId: item.id,
                  readStatus: item.readStatus,
                  phoneNumber: formatPhoneNumber(
                    item.conversation?.companyCustomer?.customer?.phoneNumber,
                  ),
                };
              })
            : {},
        );

        activityLog.newData = JSON.stringify(
          participants?.length > 0
            ? _.cloneDeep(participants).map((item: any) => {
                return {
                  participantId: item.id,
                  readStatus: data.readStatus,
                  phoneNumber: formatPhoneNumber(
                    item.conversation?.companyCustomer?.customer?.phoneNumber,
                  ),
                };
              })
            : {},
        );
      }

      activityLog = {
        ...activityLog,
        logType: LogType.UPDATE,
        logEntity: LogEntity.PARTICIPANTS,
        logAction:
          data?.readStatus === 'read'
            ? LogAction.MARK_READ
            : data?.readStatus === 'unread'
            ? LogAction.MARK_UNREAD
            : LogAction.UNDEFINED,
      };

      await this.logActivityServices.updateUnreadMessageActivity(activityLog);
    }

    next();
  }
}
