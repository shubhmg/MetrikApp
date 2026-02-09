import Joi from 'joi';
import { ACCOUNT_TYPES } from '../../config/constants.js';

const accountTypeValues = Object.values(ACCOUNT_TYPES);

export const createAccountSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    code: Joi.string().max(50).allow('').optional(),
    type: Joi.string().valid(...accountTypeValues).required(),
    group: Joi.string().max(100).allow('').optional(),
    parentId: Joi.string().allow(null).optional(),
    openingBalance: Joi.object({
      debit: Joi.number().min(0).default(0),
      credit: Joi.number().min(0).default(0),
    }).optional(),
  }),
};

export const updateAccountSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    code: Joi.string().max(50).allow('').optional(),
    group: Joi.string().max(100).allow('').optional(),
    parentId: Joi.string().allow(null).optional(),
    openingBalance: Joi.object({
      debit: Joi.number().min(0),
      credit: Joi.number().min(0),
    }).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

export const listAccountSchema = {
  query: Joi.object({
    type: Joi.string().valid(...accountTypeValues).optional(),
    group: Joi.string().optional(),
    search: Joi.string().optional(),
  }),
};
