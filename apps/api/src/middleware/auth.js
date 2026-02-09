import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import User from '../modules/auth/user.model.js';

export default async function auth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized('Invalid token'));
  }
}
