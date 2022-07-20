import * as Joi from '@hapi/joi';
import { MessageMode } from 'src/common/constant/message-mode';

export const CreateMessageSchema = Joi.object().keys({
  customer: Joi.array().required(),
  content: Joi.string().required(),
  isHaveAttachment: Joi.boolean(),
  conversationId: Joi.string().guid().required(),
  mode: Joi.string()
    .valid(MessageMode.BULK, MessageMode.NORMAL, MessageMode.SCHEDULE)
    .required(),
  creationUserId: Joi.string().guid().allow(null, ''),
});
