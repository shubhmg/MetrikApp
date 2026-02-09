/**
 * Mongoose plugin: adds createdBy, updatedBy fields + timestamps.
 */
export default function auditFields(schema) {
  schema.add({
    createdBy: { type: 'ObjectId', ref: 'User' },
    updatedBy: { type: 'ObjectId', ref: 'User' },
  });

  schema.set('timestamps', true);
}
