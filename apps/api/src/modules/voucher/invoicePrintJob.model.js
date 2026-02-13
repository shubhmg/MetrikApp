import mongoose from 'mongoose';
import softDelete from '../../plugins/softDelete.js';
import auditFields from '../../plugins/auditFields.js';

const invoicePrintJobSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true, index: true },
  materialCentreId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCentre', required: true, index: true },
  toEmail: { type: String, required: true, trim: true, lowercase: true },
  status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued', index: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date },
  error: { type: String },
});

invoicePrintJobSchema.plugin(softDelete);
invoicePrintJobSchema.plugin(auditFields);

invoicePrintJobSchema.index({ businessId: 1, voucherId: 1, materialCentreId: 1, createdAt: -1 });

const InvoicePrintJob = mongoose.model('InvoicePrintJob', invoicePrintJobSchema);
export default InvoicePrintJob;
