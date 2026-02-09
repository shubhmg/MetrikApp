import mongoose from 'mongoose';

const journalEntrySchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
    voucherType: { type: String, required: true },
    voucherNumber: { type: String, required: true },
    date: { type: Date, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: String,
    financialYear: { type: String, required: true },
    isReverse: { type: Boolean, default: false },
  },
  { timestamps: true }
);

journalEntrySchema.index({ businessId: 1, accountId: 1, date: -1 });
journalEntrySchema.index({ businessId: 1, voucherId: 1 });
journalEntrySchema.index({ businessId: 1, financialYear: 1 });
journalEntrySchema.index({ businessId: 1, date: -1 });

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
export default JournalEntry;
