import Account from './account.model.js';
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
