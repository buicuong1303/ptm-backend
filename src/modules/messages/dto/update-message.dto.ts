import { ExternalStatus } from 'src/common/constant/external-status';
import { InternalStatus } from 'src/common/constant/internal-status';

export class UpdateMessageDto {
  internalMessageStatus: InternalStatus;
  externalMessageStatus: ExternalStatus;
  externalId: string;
  messageId: string;
}
