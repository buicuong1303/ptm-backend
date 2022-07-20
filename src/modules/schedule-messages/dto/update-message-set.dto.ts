import { UUIDVersion } from 'class-validator';
import { MessageSetStatus } from 'src/common/constant/message-set-status';
export class UpdateMessageSetDto {
  messageSetIds: Array<UUIDVersion>;
  status: MessageSetStatus;
}
