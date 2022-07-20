import { Message } from 'src/modules/messages/entity/message.entity';
import { User } from 'src/modules/users/entity/user.entity';
export class UpdateConversationDto {
  lastMessage: Message;
  lastUser?: User;
}
