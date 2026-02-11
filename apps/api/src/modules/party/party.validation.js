import Joi from 'joi';
import { PARTY_TYPES } from '../../config/constants.js';

const partyTypeValues = Object.values(PARTY_TYPES);
const contractorSettingsSchema = Joi.object({
  consumeMaterialCentreId: Joi.string().allow(null).optional(),
  outputMaterialCentreId: Joi.string().allow(null).optional(),
  linkedUserId: Joi.string().allow(null).optional(),
  isEnabled: Joi.boolean().optional(),
  itemRates: Joi.array().items(
    Joi.object({
      itemId: Joi.string().required(),
      rate: Joi.number().min(0).required(),
      rateUom: Joi.string().valid('per_unit', 'per_dozen').default('per_dozen'),
    })
  ).optional(),
}).optional();

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
    contractorSettings: contractorSettingsSchema,
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
    contractorSettings: contractorSettingsSchema,
    isActive: Joi.boolean().optional(),
  }).min(1),
};

export const listPartySchema = {
  query: Joi.object({
    type: Joi.string().valid(...partyTypeValues).optional(),
    search: Joi.string().optional(),
  }),
};

export const getPartyLedgerSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  query: Joi.object({
    financialYear: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
  }),
};
