import { PartialType } from '@nestjs/mapped-types';
import { NotificationTemplateDto } from './get-notification-template.dto';

export class UpdateNotificationDto extends PartialType(
  NotificationTemplateDto,
) {}
