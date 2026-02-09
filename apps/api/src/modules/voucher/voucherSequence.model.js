import mongoose from 'mongoose';

const voucherSequenceSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  voucherType: { type: String, required: true },
  financialYear: { type: String, required: true },
  prefix: { type: String, required: true },
  lastNumber: { type: Number, default: 0 },
});

// Ensures one sequence per business + type + FY
voucherSequenceSchema.index(
  { businessId: 1, voucherType: 1, financialYear: 1 },
  { unique: true }
);

/**
 * Atomically generates the next voucher number.
 * Format: PREFIX-FY-SEQUENCE (e.g. SAL-2024-25-00001)
 */
voucherSequenceSchema.statics.getNextNumber = async function (businessId, voucherType, financialYear, prefix, session) {
  const seq = await this.findOneAndUpdate(
    { businessId, voucherType, financialYear },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { prefix },
    },
    { new: true, upsert: true, session }
  );

  const paddedNum = String(seq.lastNumber).padStart(5, '0');
  return `${prefix}-${financialYear}-${paddedNum}`;
};

const VoucherSequence = mongoose.model('VoucherSequence', voucherSequenceSchema);
export default VoucherSequence;
