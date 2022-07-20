import * as Joi from '@hapi/joi';

export const ResetPasswordSchema = Joi.object().keys({
  newPassword: Joi.string()
    .regex(
      /^(?=.*\d)(?=.*?[#?!@$%^&*-])(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/,
    )
    .message(
      'Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character',
    ),
  accessToken: Joi.string().required(),
});
