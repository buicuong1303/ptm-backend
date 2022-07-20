import * as Joi from '@hapi/joi';
import { MessageDirection } from 'src/common/constant/message-direction';
import { MessageMode } from 'src/common/constant/message-mode';

export const CreateMessageSchema = Joi.object().keys({
  internalMessageStatus: Joi.string().required(),
  direction: Joi.string()
    .valid(MessageDirection.INBOUND, MessageDirection.OUTBOUND)
    .required(),
  content: Joi.string().required(),
  isHaveAttachment: Joi.boolean().required(),
  conversationId: Joi.string().guid().required(),
  externalMessageStatus: Joi.string().allow(null, ''),
  mode: Joi.string()
    .valid(MessageMode.BULK, MessageMode.NORMAL, MessageMode.SCHEDULE)
    .required(),
  creationUserId: Joi.string().guid().allow(null, ''),
});
