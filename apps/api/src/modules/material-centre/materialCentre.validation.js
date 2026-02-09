import Joi from 'joi';
import { MC_TYPES } from '../../config/constants.js';

const mcTypeValues = Object.values(MC_TYPES);

export const createMCSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    code: Joi.string().min(1).max(50).required(),
    type: Joi.string().valid(...mcTypeValues).required(),
    address: Joi.object({
      line1: Joi.string().allow('').optional(),
      line2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
    }).optional(),
    isDefault: Joi.boolean().optional(),
  }),
};

export const updateMCSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    address: Joi.object({
      line1: Joi.string().allow('').optional(),
      line2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
    }).optional(),
    isDefault: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};
