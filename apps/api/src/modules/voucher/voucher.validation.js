import Joi from 'joi';
import { VOUCHER_TYPE_VALUES } from '../../config/constants.js';

const lineItemSchema = Joi.object({
  itemId: Joi.string().allow(null).optional(),
  itemName: Joi.string().allow('').optional(),
  quantity: Joi.number().default(0),
  rate: Joi.number().min(0).default(0),
  amount: Joi.number().optional(), // auto-calculated
  discount: Joi.number().min(0).default(0),
  gstRate: Joi.number().min(0).max(100).default(0),
  taxAmount: Joi.number().optional(), // auto-calculated
  accountId: Joi.string().allow(null).optional(),
  debit: Joi.number().min(0).default(0),
  credit: Joi.number().min(0).default(0),
  materialCentreId: Joi.string().allow(null).optional(),
  narration: Joi.string().allow('').optional(),
});

export const createVoucherSchema = {
  body: Joi.object({
    voucherType: Joi.string().valid(...VOUCHER_TYPE_VALUES).required(),
    date: Joi.date().required(),
    partyId: Joi.string().allow(null).optional(),
    materialCentreId: Joi.string().allow(null).optional(),
    lineItems: Joi.array().items(lineItemSchema).min(1).required(),
    bomId: Joi.string().allow(null).optional(),
    fromMaterialCentreId: Joi.string().allow(null).optional(),
    toMaterialCentreId: Joi.string().allow(null).optional(),
    linkedVouchers: Joi.array()
      .items(
        Joi.object({
          voucherId: Joi.string().required(),
          voucherType: Joi.string().valid(...VOUCHER_TYPE_VALUES).optional(),
          relationship: Joi.string().optional(),
        })
      )
      .optional(),
    narration: Joi.string().max(500).allow('').optional(),
  }),
};

export const postVoucherSchema = {
  params: Joi.object({ id: Joi.string().required() }),
};

export const cancelVoucherSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    reason: Joi.string().min(1).max(500).required(),
  }),
};

export const listVoucherSchema = {
  query: Joi.object({
    voucherType: Joi.string().valid(...VOUCHER_TYPE_VALUES).optional(),
    status: Joi.string().valid('draft', 'posted', 'cancelled').optional(),
    partyId: Joi.string().optional(),
    fromDate: Joi.date().optional(),
    toDate: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
