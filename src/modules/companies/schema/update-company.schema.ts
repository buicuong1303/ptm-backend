import * as Joi from '@hapi/joi';
import { EntityStatus } from 'src/common/constant/entity-status';

export const UpdateCompanySchema = Joi.object().keys({
  id: Joi.string().guid().required(),
  name: Joi.string().required(),
  code: Joi.string().allow(null, ''),
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
  creationUserId: Joi.string().allow(null, ''),
  lastModifiedTime: Joi.string().allow(null, ''),
  creationTime: Joi.string().allow(null, ''),
  lastModifiedUserId: Joi.string().allow(null, ''),

  server: Joi.string().allow(null, ''),
  clientId: Joi.string().allow(null, ''),
  clientSecret: Joi.string().allow(null, ''),
  username: Joi.string().allow(null, ''),
  password: Joi.string().allow(null, ''),
  extension: Joi.string().allow(null, ''),
  dlrAddress: Joi.string().allow(null, ''),
  dlrMTT: Joi.string().allow(null, ''),
  appStatus: Joi.string().allow(null, ''),
  appError: Joi.string().allow(null, ''),
});
