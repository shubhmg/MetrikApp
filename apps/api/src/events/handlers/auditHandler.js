import AuditLog from '../../modules/audit/auditLog.model.js';
import emitter from '../emitter.js';

emitter.on('audit', async (data) => {
  try {
    await AuditLog.create(data);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
});

export function emitAudit({ businessId, userId, userName, action, module, documentId, documentType, before, after, req }) {
  emitter.emit('audit', {
    businessId,
    userId,
    userName,
    action,
    module,
    documentId,
    documentType,
    before,
    after,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent'),
    timestamp: new Date(),
  });
}
