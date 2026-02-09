import * as authService from './auth.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
});

export const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body);
  res.json({ success: true, data: result });
});

export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id, req.body.refreshToken);
  res.json({ success: true, message: 'Logged out' });
});

export const me = catchAsync(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
