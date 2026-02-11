import mongoose from 'mongoose';
import Account from './account.model.js';
import JournalEntry from '../voucher/journalEntry.model.js';
import ApiError from '../../utils/ApiError.js';

export async function createAccount(data, businessId, userId) {
  if (data.code) {
    const exists = await Account.findOne({ businessId, code: data.code });
    if (exists) throw ApiError.conflict(`Account code "${data.code}" already exists`);
  }

  return Account.create({
    ...data,
    businessId,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function listAccounts(businessId, filters = {}) {
  const query = { businessId };

  if (filters.type) query.type = filters.type;
  if (filters.group) query.group = filters.group;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { code: { $regex: filters.search, $options: 'i' } },
    ];
  }

  return Account.find(query).sort({ type: 1, group: 1, name: 1 });
}

export async function getAccountById(id, businessId) {
  const account = await Account.findOne({ _id: id, businessId });
  if (!account) throw ApiError.notFound('Account not found');
  return account;
}

export async function updateAccount(id, data, businessId, userId) {
  const account = await Account.findOne({ _id: id, businessId });
  if (!account) throw ApiError.notFound('Account not found');

  if (account.isSystemAccount && data.type) {
    throw ApiError.badRequest('Cannot change type of system account');
  }

  Object.assign(account, data, { updatedBy: userId });
  return account.save();
}

export async function deleteAccount(id, businessId, userId) {
  const account = await Account.findOne({ _id: id, businessId });
  if (!account) throw ApiError.notFound('Account not found');

  if (account.isSystemAccount) {
    throw ApiError.badRequest('Cannot delete system account');
  }

  return account.softDelete(userId);
}

export async function getAccountLedger(accountId, businessId, filters = {}) {
  const businessObjectId = typeof businessId === 'string' ? new mongoose.Types.ObjectId(businessId) : businessId;
  const accountObjectId = typeof accountId === 'string' ? new mongoose.Types.ObjectId(accountId) : accountId;

  const account = await Account.findOne({ _id: accountObjectId, businessId: businessObjectId });
  if (!account) throw ApiError.notFound('Account not found');

  const query = {
    businessId: businessObjectId,
    accountId: accountObjectId,
  };

  if (filters.financialYear) {
    query.financialYear = filters.financialYear;
  }

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
    if (filters.toDate) query.date.$lte = new Date(filters.toDate);
  }

  const entries = await JournalEntry.find(query)
    .sort({ date: 1, createdAt: 1 })
    .lean();

  // Calculate opening balance
  const initialDebit = account.openingBalance?.debit || 0;
  const initialCredit = account.openingBalance?.credit || 0;
  let openingBalance = initialDebit - initialCredit;

  // If filtering, add previous transactions to opening balance
  const preQuery = {
    businessId: businessObjectId,
    accountId: accountObjectId,
  };
  let hasPreQuery = false;

  if (filters.fromDate) {
    preQuery.date = { $lt: new Date(filters.fromDate) };
    hasPreQuery = true;
  } else if (filters.financialYear) {
    // Use both FY string and date boundary to be resilient to bad data
    const parts = String(filters.financialYear).split('-');
    const startYear = parseInt(parts[0], 10);
    const fyCutoff = !Number.isNaN(startYear) ? new Date(startYear, 3, 1) : null; // April 1
    preQuery.$or = [
      { financialYear: { $lt: filters.financialYear } },
      ...(fyCutoff ? [{ date: { $lt: fyCutoff } }] : []),
    ];
    hasPreQuery = true;
  }

  if (hasPreQuery) {
    const result = await JournalEntry.aggregate([
      { $match: preQuery },
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
    ]);

    if (result.length > 0) {
      openingBalance += (result[0].totalDebit - result[0].totalCredit);
    }
  }

  return {
    account,
    openingBalance,
    entries,
  };
}
