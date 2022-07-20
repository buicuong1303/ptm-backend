import * as Joi from '@hapi/joi';

export const CreateUserSchema = Joi.object().keys({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string(),
  gender: Joi.string(),
  status: Joi.string(),
  permissionDeletes: Joi.array(),
  permissions: Joi.array(),
  roles: Joi.array(),
  roleDeletes: Joi.array(),
  companies: Joi.array(),
});
