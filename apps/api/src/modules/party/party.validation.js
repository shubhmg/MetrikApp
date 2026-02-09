import Joi from 'joi';
import { PARTY_TYPES } from '../../config/constants.js';

const partyTypeValues = Object.values(PARTY_TYPES);

export const createPartySchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    type: Joi.array().items(Joi.string().valid(...partyTypeValues)).min(1).required(),
    gstin: Joi.string().max(20).allow('').optional(),
    pan: Joi.string().max(20).allow('').optional(),
    phone: Joi.string().max(20).allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    address: Joi.object({
      line1: Joi.string().allow('').optional(),
      line2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
      country: Joi.string().default('India'),
    }).optional(),
    openingBalance: Joi.number().default(0),
    creditLimit: Joi.number().min(0).default(0),
    creditDays: Joi.number().integer().min(0).default(0),
    bankDetails: Joi.object({
      accountName: Joi.string().allow('').optional(),
      accountNumber: Joi.string().allow('').optional(),
      bankName: Joi.string().allow('').optional(),
      ifsc: Joi.string().allow('').optional(),
      branch: Joi.string().allow('').optional(),
    }).optional(),
  }),
};

export const updatePartySchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    type: Joi.array().items(Joi.string().valid(...partyTypeValues)).min(1).optional(),
    gstin: Joi.string().max(20).allow('').optional(),
    pan: Joi.string().max(20).allow('').optional(),
    phone: Joi.string().max(20).allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    address: Joi.object({
      line1: Joi.string().allow('').optional(),
      line2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
      country: Joi.string().optional(),
    }).optional(),
    creditLimit: Joi.number().min(0).optional(),
    creditDays: Joi.number().integer().min(0).optional(),
    bankDetails: Joi.object({
      accountName: Joi.string().allow('').optional(),
      accountNumber: Joi.string().allow('').optional(),
      bankName: Joi.string().allow('').optional(),
      ifsc: Joi.string().allow('').optional(),
      branch: Joi.string().allow('').optional(),
    }).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

export const listPartySchema = {
  query: Joi.object({
    type: Joi.string().valid(...partyTypeValues).optional(),
    search: Joi.string().optional(),
  }),
};
