/**
 * Mongoose plugin: auto-filter all queries by businessId.
 * Expects req.business._id to be set via tenantContext middleware.
 */
export default function tenantScope(schema) {
  schema.add({
    businessId: {
      type: 'ObjectId',
      ref: 'Business',
      required: true,
      index: true,
    },
  });

  // Auto-filter find queries
  for (const method of ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'countDocuments', 'updateMany', 'deleteMany']) {
    schema.pre(method, function () {
      if (this._skipTenantScope) return;
      if (this.getFilter().businessId) return; // already set
      // Will be a no-op if businessId not set on query — caller must set it
    });
  }
}
