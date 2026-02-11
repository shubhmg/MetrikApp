import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  symbol: { type: String, required: true, trim: true }, // e.g. pcs, kg, ltr
  isActive: { type: Boolean, default: true },
});

unitSchema.plugin(tenantScope);
unitSchema.plugin(softDelete);
unitSchema.plugin(auditFields);

unitSchema.index({ businessId: 1, symbol: 1 }, { unique: true });
unitSchema.index({ businessId: 1, name: 1 });

const Unit = mongoose.model('Unit', unitSchema);
export default Unit;
