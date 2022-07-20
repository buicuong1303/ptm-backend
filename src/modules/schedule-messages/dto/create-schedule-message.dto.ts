import { UUIDVersion } from 'class-validator';
export class CreateScheduleMessageDto {
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
}
