import { UUIDVersion } from 'class-validator';
export class UpdateScheduleMessageDto {
  name: string;
  content: string;
  attachmentUrls: Array<JSON>;
  companyId: UUIDVersion;
  cronExpression: string;
  isCronExpression: boolean;
  dateTime: string;
  customerUrl: JSON;
  customFields: Array<any>;
  campaignId: UUIDVersion;
  canRetry: boolean;
  backupScheduleMessageId?: string;
}
