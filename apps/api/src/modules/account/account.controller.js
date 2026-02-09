import * as accountService from './account.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const account = await accountService.createAccount(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { account } });
});

export const list = catchAsync(async (req, res) => {
  const accounts = await accountService.listAccounts(req.businessId, req.query);
  res.json({ success: true, data: { accounts } });
});

export const getById = catchAsync(async (req, res) => {
  const account = await accountService.getAccountById(req.params.id, req.businessId);
  res.json({ success: true, data: { account } });
});

export const update = catchAsync(async (req, res) => {
  const account = await accountService.updateAccount(req.params.id, req.body, req.businessId, req.user._id);
  res.json({ success: true, data: { account } });
});

export const remove = catchAsync(async (req, res) => {
  await accountService.deleteAccount(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, message: 'Account deleted' });
});
