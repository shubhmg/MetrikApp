import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { PARTY_TYPES } from '../../config/constants.js';

const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: [{
    type: String,
    enum: Object.values(PARTY_TYPES),
    required: true,
  }],
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  openingBalance: { type: Number, default: 0 }, // positive = receivable, negative = payable
  creditLimit: { type: Number, default: 0 },
  creditDays: { type: Number, default: 0 },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifsc: String,
    branch: String,
  },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  isActive: { type: Boolean, default: true },
});

partySchema.plugin(tenantScope);
partySchema.plugin(softDelete);
partySchema.plugin(auditFields);

partySchema.index({ businessId: 1, name: 1 });
partySchema.index({ businessId: 1, 'type': 1 });
partySchema.index({ businessId: 1, gstin: 1 });

const Party = mongoose.model('Party', partySchema);
export default Party;
