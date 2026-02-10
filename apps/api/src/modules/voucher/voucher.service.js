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
  if (filters.materialCentreId) query.materialCentreId = filters.materialCentreId;

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
    if (filters.toDate) {
      const end = new Date(filters.toDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
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
    .populate('cancelledBy', 'name')
    .populate('linkedVouchers.voucherId', 'voucherNumber voucherType status');

  if (!voucher) throw ApiError.notFound('Voucher not found');
  return voucher;
}

export async function updateVoucher(id, data, businessId, userId, req) {
  return voucherEngine.update(id, data, businessId, userId, req);
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

const DELETABLE_TYPES = ['sales_order', 'purchase_order'];

export async function deleteVoucher(id, businessId, userId) {
  const voucher = await Voucher.findOne({ _id: id, businessId });
  if (!voucher) throw ApiError.notFound('Voucher not found');
  if (!DELETABLE_TYPES.includes(voucher.voucherType)) {
    throw ApiError.badRequest('Only order vouchers can be deleted');
  }
  return voucher.softDelete(userId);
}

const ORDER_TO_INVOICE_MAP = {
  sales_order: 'sales_invoice',
  purchase_order: 'purchase_invoice',
};

export async function convertOrderToInvoice(orderId, businessId, userId) {
  const order = await Voucher.findOne({ _id: orderId, businessId });
  if (!order) throw ApiError.notFound('Order not found');

  const invoiceType = ORDER_TO_INVOICE_MAP[order.voucherType];
  if (!invoiceType) {
    throw ApiError.badRequest('Only sales orders and purchase orders can be converted to invoices');
  }

  if (order.status === 'cancelled') {
    throw ApiError.badRequest('Cannot convert a cancelled order');
  }

  const lineItems = order.lineItems.map((li) => ({
    itemId: li.itemId,
    quantity: li.quantity,
    rate: li.rate,
    discount: li.discount,
    gstRate: li.gstRate,
  }));

  const invoiceData = {
    voucherType: invoiceType,
    date: new Date(),
    partyId: order.partyId,
    materialCentreId: order.materialCentreId,
    narration: order.narration || '',
    lineItems,
    linkedVouchers: [
      {
        voucherId: order._id,
        voucherType: order.voucherType,
        relationship: 'converted_from',
      },
    ],
  };

  return voucherEngine.create(invoiceData, businessId, userId);
}
