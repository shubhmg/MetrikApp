import Business from './business.model.js';
import User from '../auth/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../config/constants.js';
import { seedChartOfAccounts } from '../account/account.seed.js';
import { ALL_PERMISSIONS } from '../../config/permissions.js';

export async function createBusiness(data, userId) {
  const business = await Business.create({
    ...data,
    createdBy: userId,
    updatedBy: userId,
  });

  // Add user as owner of the business
  await User.findByIdAndUpdate(userId, {
    $push: {
      businesses: {
        businessId: business._id,
        role: ROLES.OWNER,
        permissions: ALL_PERMISSIONS,
        isActive: true,
      },
    },
  });

  // Seed default Chart of Accounts
  await seedChartOfAccounts(business._id, userId);

  return business;
}

export async function getUserBusinesses(userId) {
  const user = await User.findById(userId).populate('businesses.businessId');
  return user.businesses
    .filter((b) => b.isActive && b.businessId)
    .map((b) => ({
      ...b.businessId.toObject(),
      role: b.role,
    }));
}

export async function getBusinessById(businessId, userId) {
  const user = await User.findById(userId);
  const membership = user.businesses.find(
    (b) => b.businessId.toString() === businessId && b.isActive
  );
  if (!membership) {
    throw ApiError.forbidden('No access to this business');
  }

  const business = await Business.findById(businessId);
  if (!business || business.isDeleted) {
    throw ApiError.notFound('Business not found');
  }

  return business;
}

export async function updateBusiness(businessId, data, userId) {
  const business = await Business.findById(businessId);
  if (!business || business.isDeleted) {
    throw ApiError.notFound('Business not found');
  }

  Object.assign(business, data, { updatedBy: userId });
  await business.save();
  return business;
}
