import Joi from 'joi';
import { ITEM_GROUP_TYPES } from '../../config/constants.js';

const itemGroupTypeValues = Object.values(ITEM_GROUP_TYPES);

// ItemGroup
export const createItemGroupSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    code: Joi.string().min(1).max(50).required(),
    type: Joi.string().valid(...itemGroupTypeValues).required(),
    description: Joi.string().max(500).allow('').optional(),
  }),
};

export const updateItemGroupSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(500).allow('').optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

// Item
export const createItemSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    sku: Joi.string().min(1).max(50).required(),
    itemGroupId: Joi.string().required(),
    unit: Joi.string().min(1).max(20).required(),
    hsnCode: Joi.string().max(20).allow('').optional(),
    gstRate: Joi.number().min(0).max(100).default(0),
    salesPrice: Joi.number().min(0).default(0),
    reorderLevel: Joi.number().min(0).default(0),
    description: Joi.string().max(500).allow('').optional(),
  }),
};

export const updateItemSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    unit: Joi.string().min(1).max(20).optional(),
    hsnCode: Joi.string().max(20).allow('').optional(),
    gstRate: Joi.number().min(0).max(100).optional(),
    salesPrice: Joi.number().min(0).optional(),
    reorderLevel: Joi.number().min(0).optional(),
    description: Joi.string().max(500).allow('').optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

export const listItemSchema = {
  query: Joi.object({
    itemGroupId: Joi.string().optional(),
    search: Joi.string().optional(),
  }),
};

export const getItemLedgerSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  query: Joi.object({
    financialYear: Joi.string().optional(),
    fromDate: Joi.date().optional(),
    toDate: Joi.date().optional(),
    materialCentreId: Joi.string().optional(),
  }),
};
