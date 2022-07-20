import { ReadStatus } from 'src/common/constant/read-status';

export class CreateConversationDto {
  userId: string;
  conversationId: string;
  readStatus: ReadStatus;
}
