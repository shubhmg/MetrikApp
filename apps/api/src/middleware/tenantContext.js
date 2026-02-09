import ApiError from '../utils/ApiError.js';

/**
 * Extracts businessId from x-business-id header and validates
 * that the authenticated user has access to this business.
 */
export default function tenantContext(req, _res, next) {
  const businessId = req.headers['x-business-id'];
  if (!businessId) {
    return next(ApiError.badRequest('x-business-id header is required'));
  }

  // Check user has access to this business
  const membership = req.user.businesses.find(
    (b) => b.businessId.toString() === businessId && b.isActive
  );

  if (!membership) {
    return next(ApiError.forbidden('No access to this business'));
  }

  req.businessId = businessId;
  req.businessRole = membership.role;
  req.businessPermissions = membership.permissions;
  next();
}
