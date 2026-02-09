import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: String,
    action: { type: String, required: true }, // create, update, delete, post, cancel
    module: { type: String, required: true }, // voucher, item, party, etc.
    documentId: { type: mongoose.Schema.Types.ObjectId },
    documentType: String,
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ businessId: 1, timestamp: -1 });
auditLogSchema.index({ documentId: 1, documentType: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
