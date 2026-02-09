import Joi from 'joi';
import { BOM_STATUS } from '../../config/constants.js';

const bomStatusValues = Object.values(BOM_STATUS);

const inputSchema = Joi.object({
  itemId: Joi.string().required(),
  quantity: Joi.number().min(0.0001).required(),
  wastagePercent: Joi.number().min(0).max(100).default(0),
  narration: Joi.string().max(200).allow('').optional(),
});

export const createBomSchema = {
  body: Joi.object({
    outputItemId: Joi.string().required(),
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(500).allow('').optional(),
    outputQuantity: Joi.number().min(0.0001).default(1),
    inputs: Joi.array().items(inputSchema).min(1).required(),
    defaultMaterialCentreId: Joi.string().allow(null).optional(),
  }),
};

export const updateBomSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(500).allow('').optional(),
    outputQuantity: Joi.number().min(0.0001).optional(),
    inputs: Joi.array().items(inputSchema).min(1).optional(),
    defaultMaterialCentreId: Joi.string().allow(null).optional(),
  }).min(1),
};

export const listBomSchema = {
  query: Joi.object({
    outputItemId: Joi.string().optional(),
    status: Joi.string().valid(...bomStatusValues).optional(),
    search: Joi.string().optional(),
  }),
};

export const expandBomSchema = {
  query: Joi.object({
    bomId: Joi.string().required(),
    outputQuantity: Joi.number().min(0.0001).required(),
  }),
};
