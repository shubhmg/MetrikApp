import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from './user.model.js';
import env from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';

function generateAccessToken(user) {
  return jwt.sign({ sub: user._id, email: user.email }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function parseExpiry(str) {
  const match = str.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const num = parseInt(match[1], 10);
  const unit = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[match[2]];
  return num * unit;
}

export async function register({ name, email, phone, password }) {
  const exists = await User.findOne({ email });
  if (exists) {
    throw ApiError.conflict('Email already registered');
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: password, // pre-save hook hashes it
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn));

  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  return { user: user.toJSON(), accessToken, refreshToken };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn));

  // Cleanup expired tokens and add new one
  user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > new Date());
  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  return { user: user.toJSON(), accessToken, refreshToken };
}

export async function refresh({ refreshToken }) {
  const user = await User.findOne({
    'refreshTokens.token': refreshToken,
    'refreshTokens.expiresAt': { $gt: new Date() },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  // Remove used token
  user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);

  // Issue new pair
  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn));

  user.refreshTokens.push({ token: newRefreshToken, expiresAt });
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId, refreshToken) {
  const user = await User.findById(userId);
  if (!user) return;

  user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
  await user.save();
}
