import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { VOUCHER_TYPE_VALUES, VOUCHER_STATUS } from '../../config/constants.js';

const lineItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName: String,
    quantity: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    materialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre' },
    narration: String,
  },
  { _id: true }
);

const voucherSchema = new mongoose.Schema({
  voucherType: {
    type: String,
    enum: VOUCHER_TYPE_VALUES,
    required: true,
  },
  voucherNumber: { type: String, required: true },
  financialYear: { type: String, required: true }, // e.g. "2024-25"
  date: { type: Date, required: true },

  // Party / location context
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  materialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre' },

  // Line items
  lineItems: [lineItemSchema],

  // Totals
  subtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  // Production / BOM
  bomId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillOfMaterial' },

  // Stock transfer
  fromMaterialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre' },
  toMaterialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre' },

  // Linked vouchers (order→invoice, GRN→purchase, etc.)
  linkedVouchers: [
    {
      voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
      voucherType: { type: String, enum: VOUCHER_TYPE_VALUES },
      relationship: { type: String }, // 'source', 'converted_from', 'return_of'
    },
  ],

  narration: { type: String, trim: true },

  // Status lifecycle
  status: {
    type: String,
    enum: Object.values(VOUCHER_STATUS),
    default: VOUCHER_STATUS.POSTED,
  },
  postedAt: Date,
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: String,
});

voucherSchema.plugin(tenantScope);
voucherSchema.plugin(softDelete);
voucherSchema.plugin(auditFields);

voucherSchema.index({ businessId: 1, voucherNumber: 1 }, { unique: true });
voucherSchema.index({ businessId: 1, voucherType: 1, financialYear: 1 });
voucherSchema.index({ businessId: 1, partyId: 1 });
voucherSchema.index({ businessId: 1, date: -1 });
voucherSchema.index({ businessId: 1, status: 1 });

const Voucher = mongoose.model('Voucher', voucherSchema);
export default Voucher;
