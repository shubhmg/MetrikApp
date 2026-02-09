import mongoose from 'mongoose';

const stockSummarySchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    materialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre', required: true },
    quantity: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    weightedAvgRate: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One summary per item per MC per business
stockSummarySchema.index(
  { businessId: 1, itemId: 1, materialCentreId: 1 },
  { unique: true }
);

stockSummarySchema.index({ businessId: 1, itemId: 1 });
stockSummarySchema.index({ businessId: 1, materialCentreId: 1 });

const StockSummary = mongoose.model('StockSummary', stockSummarySchema);
export default StockSummary;
