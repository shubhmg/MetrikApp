import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { BOM_STATUS } from '../../config/constants.js';

const bomInputSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 0.0001 },
  wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
  narration: { type: String, trim: true },
}, { _id: false });

const bomSchema = new mongoose.Schema({
  outputItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 500 },
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: Object.values(BOM_STATUS),
    default: BOM_STATUS.DRAFT,
  },
  outputQuantity: { type: Number, default: 1, min: 0.0001 },
  inputs: [bomInputSchema],
  defaultMaterialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre' },
  previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillOfMaterial' },
});

bomSchema.plugin(tenantScope);
bomSchema.plugin(softDelete);
bomSchema.plugin(auditFields);

// One active BOM per output item per business
bomSchema.index(
  { businessId: 1, outputItemId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
bomSchema.index({ businessId: 1, outputItemId: 1, version: -1 });
bomSchema.index({ businessId: 1, status: 1 });

const BillOfMaterial = mongoose.model('BillOfMaterial', bomSchema);
export default BillOfMaterial;
