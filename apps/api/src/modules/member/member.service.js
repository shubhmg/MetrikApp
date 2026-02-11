import User from '../auth/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../config/constants.js';
import { getDefaultPermissions } from '../../config/permissions.js';

export async function listMembers(businessId) {
  const users = await User.find({
    'businesses.businessId': businessId,
  }).select('name email phone businesses');

  return users.map((u) => {
    const membership = u.businesses.find(
      (b) => b.businessId.toString() === businessId
    );
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: membership.role,
      permissions: membership.permissions,
      allowedMaterialCentreIds: membership.allowedMaterialCentreIds || [],
      isActive: membership.isActive,
    };
  });
}

export async function getMember(userId, businessId) {
  const user = await User.findById(userId).select('name email phone businesses');
  if (!user) throw ApiError.notFound('User not found');

  const membership = user.businesses.find(
    (b) => b.businessId.toString() === businessId
  );
  if (!membership) throw ApiError.notFound('Member not found in this business');

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: membership.role,
    permissions: membership.permissions,
    allowedMaterialCentreIds: membership.allowedMaterialCentreIds || [],
    isActive: membership.isActive,
  };
}

export async function createMember(data, businessId, requestingUserId) {
  const { email, name, password, phone, role, permissions, allowedMaterialCentreIds } = data;

  // Cannot add a second owner
  if (role === ROLES.OWNER) {
    throw ApiError.badRequest('Cannot add another owner');
  }

  // Check requesting user is owner or admin
  const requester = await User.findById(requestingUserId).select('businesses');
  const requesterMembership = requester.businesses.find(
    (b) => b.businessId.toString() === businessId
  );
  if (!requesterMembership || ![ROLES.OWNER, ROLES.ADMIN].includes(requesterMembership.role)) {
    throw ApiError.forbidden('Only owner or admin can add members');
  }

  const effectivePermissions = permissions || getDefaultPermissions(role);

  let user = await User.findOne({ email });

  if (user) {
    // Check if already a member of this business
    const existing = user.businesses.find(
      (b) => b.businessId.toString() === businessId
    );
    if (existing) {
      throw ApiError.conflict('This user is already a member of this business');
    }

    // Add business membership to existing user
    user.businesses.push({
      businessId,
      role,
      permissions: effectivePermissions,
      allowedMaterialCentreIds: allowedMaterialCentreIds || [],
      isActive: true,
    });
    await user.save();
  } else {
    // Create new user
    user = await User.create({
      name,
      email,
      phone,
      passwordHash: password, // pre-save hook hashes it
      businesses: [
        {
          businessId,
          role,
          permissions: effectivePermissions,
          allowedMaterialCentreIds: allowedMaterialCentreIds || [],
          isActive: true,
        },
      ],
    });
  }

  const membership = user.businesses.find(
    (b) => b.businessId.toString() === businessId
  );

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: membership.role,
    permissions: membership.permissions,
    allowedMaterialCentreIds: membership.allowedMaterialCentreIds || [],
    isActive: membership.isActive,
  };
}

export async function updateMember(userId, data, businessId, requestingUserId) {
  const { role, permissions, isActive, allowedMaterialCentreIds } = data;

  // Cannot edit own membership
  if (userId === requestingUserId) {
    throw ApiError.badRequest('Cannot edit your own membership');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const membership = user.businesses.find(
    (b) => b.businessId.toString() === businessId
  );
  if (!membership) throw ApiError.notFound('Member not found in this business');

  // Cannot change the owner's role
  if (membership.role === ROLES.OWNER) {
    throw ApiError.badRequest('Cannot modify the owner');
  }

  // Cannot promote to owner
  if (role === ROLES.OWNER) {
    throw ApiError.badRequest('Cannot promote to owner');
  }

  if (role !== undefined) membership.role = role;
  if (permissions !== undefined) membership.permissions = permissions;
  if (allowedMaterialCentreIds !== undefined) membership.allowedMaterialCentreIds = allowedMaterialCentreIds;
  if (isActive !== undefined) membership.isActive = isActive;

  await user.save();

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: membership.role,
    permissions: membership.permissions,
    allowedMaterialCentreIds: membership.allowedMaterialCentreIds || [],
    isActive: membership.isActive,
  };
}

export async function removeMember(userId, businessId, requestingUserId) {
  if (userId === requestingUserId) {
    throw ApiError.badRequest('Cannot remove yourself');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const membership = user.businesses.find(
    (b) => b.businessId.toString() === businessId
  );
  if (!membership) throw ApiError.notFound('Member not found in this business');

  if (membership.role === ROLES.OWNER) {
    throw ApiError.badRequest('Cannot remove the owner');
  }

  membership.isActive = false;
  await user.save();

  return { message: 'Member deactivated' };
}
