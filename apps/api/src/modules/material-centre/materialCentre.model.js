import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { MC_TYPES } from '../../config/constants.js';

const materialCentreSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: Object.values(MC_TYPES),
    required: true,
  },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
  },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

materialCentreSchema.plugin(tenantScope);
materialCentreSchema.plugin(softDelete);
materialCentreSchema.plugin(auditFields);

materialCentreSchema.index({ businessId: 1, code: 1 }, { unique: true });

const MaterialCentre = mongoose.model('MaterialCentre', materialCentreSchema);
export default MaterialCentre;
