import Joi from 'joi';

export const createBusinessSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    legalName: Joi.string().max(200).allow('').optional(),
    address: Joi.object({
      line1: Joi.string().allow('').optional(),
      line2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
      country: Joi.string().default('India'),
    }).optional(),
    gstin: Joi.string().allow('').optional(),
    pan: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
  }),
};

export const updateBusinessSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    legalName: Joi.string().max(200).allow('').optional(),
    address: Joi.object({
      line1: Joi.string().allow('').optional(),
      line2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
      country: Joi.string().optional(),
    }).optional(),
    gstin: Joi.string().allow('').optional(),
    pan: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
  }).min(1),
};
