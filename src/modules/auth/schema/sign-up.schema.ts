import * as Joi from '@hapi/joi';

export const SignUpSchema = Joi.object().keys({
  username: Joi.string().min(4).max(20).required(),
  email: Joi.string().email().required(),
  firstName: Joi.string().min(3).max(20).required(),
  lastName: Joi.string().min(3).max(20).required(),
  // password: Joi.string().required(),
  password: Joi.string()
    .regex(
      /^(?=.*\d)(?=.*?[#?!@$%^&*-])(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/,
    )
    .message(
      'Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character',
    ),
  confirmPassword: Joi.string(),
});
