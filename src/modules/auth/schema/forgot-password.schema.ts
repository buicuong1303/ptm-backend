import * as Joi from '@hapi/joi';

export const ForgotPasswordSchema = Joi.object().keys({
  email: Joi.string().email().required().messages({
    'any.required': `"email" is a required field`,
  }),
});
