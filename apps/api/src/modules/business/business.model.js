import mongoose from 'mongoose';
import auditFields from '../../plugins/auditFields.js';
import softDelete from '../../plugins/softDelete.js';

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  legalName: { type: String, trim: true },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  settings: {
    financialYearStart: { type: Number, default: 4 }, // April
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
  },
  isActive: { type: Boolean, default: true },
});

businessSchema.plugin(auditFields);
businessSchema.plugin(softDelete);

const Business = mongoose.model('Business', businessSchema);
export default Business;
