import * as Joi from '@hapi/joi';

export const CreateScheduleMessageSchema = Joi.object().keys({
  name: Joi.string().required(),
  content: Joi.string().required(),
  companyId: Joi.string().guid().required(),
  campaignId: Joi.string().guid().required(),
  customerUrl: Joi.object().required(),
  attachmentUrls: Joi.array(),
  cronExpression: Joi.string(),
  dateTime: Joi.date().required(),
  customFields: Joi.array(),
  isCronExpression: Joi.boolean(),
  canRetry: Joi.boolean(),
});
