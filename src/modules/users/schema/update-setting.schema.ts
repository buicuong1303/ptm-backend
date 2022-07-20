/* eslint-disable prettier/prettier */
import * as Joi from '@hapi/joi';

// eslint-disable-next-line no-undef

export const UpdateSettingSchema = Joi.object().keys({
  allowDesktopNotification: Joi.boolean().allow(''),
  allowSoundNotification: Joi.boolean().allow(''),
});
