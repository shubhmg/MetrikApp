import Voucher from './voucher.model.js';
import StockSummary from './stockSummary.model.js';
import * as voucherEngine from '../../engines/voucher.engine.js';
import ApiError from '../../utils/ApiError.js';

export async function createVoucher(data, businessId, userId) {
  return voucherEngine.create(data, businessId, userId);
}

export async function listVouchers(businessId, filters = {}) {
  const query = { businessId };

  if (filters.voucherType) query.voucherType = filters.voucherType;
  if (filters.status) query.status = filters.status;
  if (filters.partyId) query.partyId = filters.partyId;

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
    if (filters.toDate) query.date.$lte = new Date(filters.toDate);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [vouchers, total] = await Promise.all([
    Voucher.find(query)
      .populate('partyId', 'name')
      .populate('materialCentreId', 'name code')
      .populate('lineItems.itemId', 'name sku unit')
      .populate('bomId', 'name version')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Voucher.countDocuments(query),
  ]);

  return { vouchers, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getVoucherById(id, businessId) {
  const voucher = await Voucher.findOne({ _id: id, businessId })
    .populate('partyId', 'name gstin')
    .populate('materialCentreId', 'name code')
    .populate('lineItems.itemId', 'name sku unit')
    .populate('lineItems.accountId', 'name code')
    .populate('lineItems.materialCentreId', 'name code')
    .populate('bomId', 'name version')
    .populate('postedBy', 'name')
    .populate('cancelledBy', 'name');

  if (!voucher) throw ApiError.notFound('Voucher not found');
  return voucher;
}

export async function postVoucher(id, businessId, userId, req) {
  return voucherEngine.post(id, businessId, userId, req);
}

export async function cancelVoucher(id, businessId, userId, reason, req) {
  return voucherEngine.cancel(id, businessId, userId, reason, req);
}

export async function getStockSummary(businessId, filters = {}) {
  const query = { businessId };
  if (filters.materialCentreId) query.materialCentreId = filters.materialCentreId;
  if (filters.itemId) query.itemId = filters.itemId;

  const populateOptions = {
    path: 'itemId',
    select: 'name sku unit itemGroupId',
    populate: { path: 'itemGroupId', select: 'name' }
  };

  if (filters.itemGroupId) {
    populateOptions.match = { itemGroupId: filters.itemGroupId };
  }

  const results = await StockSummary.find(query)
    .populate(populateOptions)
    .populate('materialCentreId', 'name code');

  if (filters.itemGroupId) {
    return results.filter(r => r.itemId);
  }

  return results;
}
