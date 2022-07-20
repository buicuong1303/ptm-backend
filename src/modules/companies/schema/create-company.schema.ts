import * as Joi from '@hapi/joi';
import { EntityStatus } from 'src/common/constant/entity-status';

export const CreateCompanySchema = Joi.object().keys({
  name: Joi.string().required(),
  code: Joi.string().required(),
  signature: Joi.string().guid().required(),
  status: Joi.string()
    .valid(EntityStatus.ACTIVE, EntityStatus.INACTIVE)
    .required(),
  phone: Joi.string().custom((value, helpers) => {
    const regexpPlus = /^\+\d{11}$/gi;
    const regexp = /^\d{10}$/gi;
    let isMatch = false;
    if (value && value[0] === '+') {
      isMatch = regexpPlus.test(value);
    } else {
      isMatch = regexp.test(value);
    }

    if (!isMatch) return helpers.error('any.invalid');
  }),
  description: Joi.string().allow(null, ''),

  server: Joi.string().required(),
  clientId: Joi.string().required(),
  clientSecret: Joi.string().required(),
  username: Joi.string().required(),
  password: Joi.string().required(),
  extension: Joi.string().allow(null, ''),
  dlrAddress: Joi.string().required(),
  dlrMTT: Joi.string().required(),
  appStatus: Joi.string().allow(null, ''),
  appError: Joi.string().allow(null, ''),
});
