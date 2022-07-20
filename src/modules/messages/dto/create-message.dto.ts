import { MessageDirection } from 'src/common/constant/message-direction';
import { MessageMode } from 'src/common/constant/message-mode';

export class CreateMessageDto {
  text: string;
  direction: MessageDirection;
  mode: MessageMode;
  conversationId: string;
  companyCode: string;
  attachments: Array<any>;
}
