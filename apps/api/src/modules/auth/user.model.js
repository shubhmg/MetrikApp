import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLE_VALUES } from '../../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    businesses: [
      {
        businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
        role: { type: String, enum: ROLE_VALUES, required: true },
        permissions: [{ type: String }],
        isActive: { type: Boolean, default: true },
      },
    ],
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ 'businesses.businessId': 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

// Clean up expired refresh tokens
userSchema.methods.cleanExpiredTokens = function () {
  this.refreshTokens = this.refreshTokens.filter((t) => t.expiresAt > new Date());
  return this.save();
};

const User = mongoose.model('User', userSchema);
export default User;
