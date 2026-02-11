import mongoose from 'mongoose';
import MaterialCentre from './materialCentre.model.js';
import ApiError from '../../utils/ApiError.js';

function normalizeAllowedIds(allowedIds = []) {
  if (!allowedIds || allowedIds.length === 0) return null;
  return allowedIds.map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
}

export async function createMC(data, businessId, userId) {
  const exists = await MaterialCentre.findOne({ businessId, code: data.code });
  if (exists) throw ApiError.conflict(`Material centre code "${data.code}" already exists`);

  // If setting as default, clear previous default
  if (data.isDefault) {
    await MaterialCentre.updateMany({ businessId, isDefault: true }, { isDefault: false });
  }

  return MaterialCentre.create({ ...data, businessId, createdBy: userId, updatedBy: userId });
}

export async function listMCs(businessId, allowedIds = []) {
  const allowed = normalizeAllowedIds(allowedIds);
  const query = { businessId };
  if (allowed) query._id = { $in: allowed };
  return MaterialCentre.find(query).sort({ isDefault: -1, name: 1 });
}

export async function listMCsLookup(businessId, allowedIds = []) {
  const allowed = normalizeAllowedIds(allowedIds);
  const query = { businessId };
  if (allowed) query._id = { $in: allowed };
  return MaterialCentre.find(query)
    .select('name code type')
    .sort({ isDefault: -1, name: 1 })
    .lean();
}

export async function getMCById(id, businessId, allowedIds = []) {
  const allowed = normalizeAllowedIds(allowedIds);
  const query = { _id: id, businessId };
  if (allowed) query._id = { $in: allowed };
  const mc = await MaterialCentre.findOne(query);
  if (!mc) throw ApiError.notFound('Material centre not found');
  return mc;
}

export async function updateMC(id, data, businessId, userId, allowedIds = []) {
  const allowed = normalizeAllowedIds(allowedIds);
  const query = { _id: id, businessId };
  if (allowed) query._id = { $in: allowed };
  const mc = await MaterialCentre.findOne(query);
  if (!mc) throw ApiError.notFound('Material centre not found');

  if (data.isDefault) {
    await MaterialCentre.updateMany(
      { businessId, isDefault: true, _id: { $ne: id } },
      { isDefault: false }
    );
  }

  Object.assign(mc, data, { updatedBy: userId });
  return mc.save();
}

export async function deleteMC(id, businessId, userId, allowedIds = []) {
  const allowed = normalizeAllowedIds(allowedIds);
  const query = { _id: id, businessId };
  if (allowed) query._id = { $in: allowed };
  const mc = await MaterialCentre.findOne(query);
  if (!mc) throw ApiError.notFound('Material centre not found');
  if (mc.isDefault) throw ApiError.badRequest('Cannot delete the default material centre');
  return mc.softDelete(userId);
}
