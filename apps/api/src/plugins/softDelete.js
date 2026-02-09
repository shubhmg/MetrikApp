/**
 * Mongoose plugin: soft delete support.
 * Adds isDeleted, deletedAt, deletedBy fields.
 * Auto-filters out soft-deleted docs on find queries.
 */
export default function softDelete(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: 'ObjectId', ref: 'User', default: null },
  });

  // Auto-exclude deleted docs
  for (const method of ['find', 'findOne', 'findOneAndUpdate', 'countDocuments']) {
    schema.pre(method, function () {
      if (this._includeDeleted) return;
      const filter = this.getFilter();
      if (filter.isDeleted === undefined) {
        this.where({ isDeleted: false });
      }
    });
  }

  schema.methods.softDelete = function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
}
