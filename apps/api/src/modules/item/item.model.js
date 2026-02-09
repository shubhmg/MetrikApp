import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { COSTING_METHODS } from '../../config/constants.js';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  itemGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemGroup', required: true },
  unit: { type: String, required: true, trim: true }, // kg, pcs, mtr, ltr, etc.
  hsnCode: { type: String, trim: true },
  gstRate: { type: Number, default: 0 }, // percentage e.g. 18
  costingMethod: {
    type: String,
    enum: Object.values(COSTING_METHODS),
    default: COSTING_METHODS.WEIGHTED_AVERAGE,
  },
  reorderLevel: { type: Number, default: 0 },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
});

itemSchema.plugin(tenantScope);
itemSchema.plugin(softDelete);
itemSchema.plugin(auditFields);

itemSchema.index({ businessId: 1, sku: 1 }, { unique: true });
itemSchema.index({ businessId: 1, itemGroupId: 1 });
itemSchema.index({ businessId: 1, name: 1 });

const Item = mongoose.model('Item', itemSchema);
export default Item;
