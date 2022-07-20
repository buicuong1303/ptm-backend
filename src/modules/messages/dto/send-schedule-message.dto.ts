import { UUIDVersion } from 'class-validator';
export class SendScheduleMessageDto {
  message: string;
  files: string;
  customerPhone: string;
  companyId: UUIDVersion;
}
