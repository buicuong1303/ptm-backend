import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { convertQueriesValue } from 'src/common/utils/convertQueriesValue';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { LogActivityFiltersDto } from './dto/log-activity-filters.dto';
import { LogActivitiesService } from './log-activities.service';

@Controller('log-activities')
export class LogActivitiesController {
  constructor(private readonly logActivityServices: LogActivitiesService) {}

  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/log-activities',
    possession: AuthPossession.ANY,
  })
  @Get()
  getLogs(@Query() queries): Promise<any> {
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
    } = convertQueriesValue(queries) || {};

    const logActivityFiltersDto: LogActivityFiltersDto = {
      from: from,
      to: to,
      userId: userId,
      logAction: logAction,
      logType: logType,
      conversationId: conversationId,
      participantId: participantId,
      limit: Number(limit),
      currentItem: Number(currentItem),
    };

    return this.logActivityServices.getLogs(logActivityFiltersDto);
  }
}
