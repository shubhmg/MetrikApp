import mongoose from 'mongoose';
import tenantScope from '../../plugins/tenantScope.js';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';
import { ITEM_GROUP_TYPES } from '../../config/constants.js';

const itemGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: Object.values(ITEM_GROUP_TYPES),
    required: true,
  },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
});

itemGroupSchema.plugin(tenantScope);
itemGroupSchema.plugin(softDelete);
itemGroupSchema.plugin(auditFields);

itemGroupSchema.index({ businessId: 1, code: 1 }, { unique: true });
itemGroupSchema.index({ businessId: 1, type: 1 });

const ItemGroup = mongoose.model('ItemGroup', itemGroupSchema);
export default ItemGroup;
