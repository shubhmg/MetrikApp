import MaterialCentre from './materialCentre.model.js';
import ApiError from '../../utils/ApiError.js';

export async function createMC(data, businessId, userId) {
  const exists = await MaterialCentre.findOne({ businessId, code: data.code });
  if (exists) throw ApiError.conflict(`Material centre code "${data.code}" already exists`);

  // If setting as default, clear previous default
  if (data.isDefault) {
    await MaterialCentre.updateMany({ businessId, isDefault: true }, { isDefault: false });
  }

  return MaterialCentre.create({ ...data, businessId, createdBy: userId, updatedBy: userId });
}

export async function listMCs(businessId) {
  return MaterialCentre.find({ businessId }).sort({ isDefault: -1, name: 1 });
}

export async function getMCById(id, businessId) {
  const mc = await MaterialCentre.findOne({ _id: id, businessId });
  if (!mc) throw ApiError.notFound('Material centre not found');
  return mc;
}

export async function updateMC(id, data, businessId, userId) {
  const mc = await MaterialCentre.findOne({ _id: id, businessId });
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

export async function deleteMC(id, businessId, userId) {
  const mc = await MaterialCentre.findOne({ _id: id, businessId });
  if (!mc) throw ApiError.notFound('Material centre not found');
  if (mc.isDefault) throw ApiError.badRequest('Cannot delete the default material centre');
  return mc.softDelete(userId);
}
