import { IsUUID } from 'class-validator';

export class CreateNotificationReceiverDto {
  @IsUUID()
  notificationId: string;
  @IsUUID()
  receiverId: string;
}
