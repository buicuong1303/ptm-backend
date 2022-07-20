import { LogAction } from '../enum/log-action.enum';
import { LogType } from '../enum/log-type.enum';

export class LogActivityFiltersDto {
  from?: Date;
  to?: Date;
  userId?: string;
  logAction?: LogAction;
  logType?: LogType;
  conversationId?: string;
  participantId?: string;
  limit?: number;
  currentItem?: number;
}
