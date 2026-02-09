import mongoose from 'mongoose';

const inventoryLedgerSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    materialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre', required: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
    voucherType: { type: String, required: true },
    voucherNumber: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, default: 0 },
    value: { type: Number, default: 0 }, // quantity * rate
    narration: String,
    isReverse: { type: Boolean, default: false },
  },
  { timestamps: true }
);

inventoryLedgerSchema.index({ businessId: 1, itemId: 1, materialCentreId: 1, date: -1 });
inventoryLedgerSchema.index({ businessId: 1, voucherId: 1 });
inventoryLedgerSchema.index({ businessId: 1, date: -1 });

const InventoryLedger = mongoose.model('InventoryLedger', inventoryLedgerSchema);
export default InventoryLedger;
