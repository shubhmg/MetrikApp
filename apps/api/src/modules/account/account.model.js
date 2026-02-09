import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { ACCOUNT_TYPES } from '../../config/constants.js';

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  type: {
    type: String,
    enum: Object.values(ACCOUNT_TYPES),
    required: true,
  },
  group: { type: String, trim: true }, // e.g. "Current Assets", "Sales", "Direct Expenses"
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  isSystemAccount: { type: Boolean, default: false },
  linkedPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null },
  openingBalance: {
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  isActive: { type: Boolean, default: true },
});

accountSchema.plugin(tenantScope);
accountSchema.plugin(softDelete);
accountSchema.plugin(auditFields);

accountSchema.index({ businessId: 1, code: 1 }, { unique: true, sparse: true });
accountSchema.index({ businessId: 1, name: 1 });
accountSchema.index({ businessId: 1, type: 1 });
accountSchema.index({ businessId: 1, linkedPartyId: 1 });

const Account = mongoose.model('Account', accountSchema);
export default Account;
