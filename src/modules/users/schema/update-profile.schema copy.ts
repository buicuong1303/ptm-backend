/* eslint-disable prettier/prettier */
import * as Joi from '@hapi/joi';

// eslint-disable-next-line no-undef
const emailAddressDomainName = 'phpbroker.com,phpgroup.com'.split(',');

export const UpdateProfileSchema = Joi.object().keys({
  id: Joi.string().allow(''),
  firstName: Joi.string().required().messages({
    'string.empty': 'First name is required',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().required().messages({
    'string.empty': 'Last name is required',
    'any.required': 'Last name is required',
  }),
  username: Joi.string().allow(''),
  email: Joi.string()
    .email()
    .custom((value, helpers) => {
      if (value) {
        const emailDomain = value.split('@')[1];
        if (emailAddressDomainName.indexOf(emailDomain) === -1)
          return helpers.message({
            custom: `Email only ${emailAddressDomainName
              .toString()
              .replace(/,/g, ', ')} domains are allowed.`,
          });
        return value;
      }
      return value;
    }, 'description function')
    .required()
    .messages({
      'string.email': 'Invalid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
  phone: Joi.string().allow(''),
  department: Joi.string().allow(''),
  company: Joi.string().allow(),
  gender: Joi.string().allow(''),
  status: Joi.string().allow(''),
});
