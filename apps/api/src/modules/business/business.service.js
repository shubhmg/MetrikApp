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
  const user = await User.findById(userId).select('businesses');
  const membership = user?.businesses?.find(
    (b) => b.businessId.toString() === businessId && b.isActive
  );
  if (!membership) throw ApiError.forbidden('No access to this business');
  if (![ROLES.OWNER, ROLES.ADMIN].includes(membership.role)) {
    throw ApiError.forbidden('Only owner/admin can update business settings');
  }

  const business = await Business.findById(businessId);
  if (!business || business.isDeleted) {
    throw ApiError.notFound('Business not found');
  }

  if (data.settings) {
    business.settings = {
      ...(business.settings?.toObject ? business.settings.toObject() : business.settings || {}),
      ...data.settings,
      features: {
        ...(business.settings?.features?.toObject ? business.settings.features.toObject() : business.settings?.features || {}),
        ...(data.settings.features || {}),
      },
    };
  }

  const payload = { ...data };
  delete payload.settings;
  Object.assign(business, payload, { updatedBy: userId });
  await business.save();
  return business;
}
