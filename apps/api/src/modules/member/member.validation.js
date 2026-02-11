import Joi from 'joi';
import { ROLE_VALUES } from '../../config/constants.js';
import { ALL_PERMISSIONS } from '../../config/permissions.js';

export const createMemberSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(1).max(200).required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().max(20).allow('').optional(),
    role: Joi.string().valid(...ROLE_VALUES).required(),
    permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)).optional(),
    allowedMaterialCentreIds: Joi.array().items(Joi.string()).optional(),
  }),
};

export const updateMemberSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    role: Joi.string().valid(...ROLE_VALUES).optional(),
    permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)).optional(),
    isActive: Joi.boolean().optional(),
    allowedMaterialCentreIds: Joi.array().items(Joi.string()).optional(),
  }).min(1),
};

export const listMemberSchema = {
  query: Joi.object({
    role: Joi.string().valid(...ROLE_VALUES).optional(),
  }),
};
