import * as Joi from '@hapi/joi';

export const ChangeConfirmationEmailSchema = Joi.object().keys({
  email: Joi.string().email().required(),
});
