import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';

const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 6,
  [ROLES.ADMIN]: 5,
  [ROLES.MANAGER]: 4,
  [ROLES.ACCOUNTANT]: 3,
  [ROLES.OPERATOR]: 2,
  [ROLES.VIEWER]: 1,
};

/**
 * Checks that the user's role for the current business meets
 * the minimum required role level.
 * Usage: rbac(ROLES.MANAGER) — allows manager, admin, owner
 */
export function rbac(minRole) {
  return (req, _res, next) => {
    const userLevel = ROLE_HIERARCHY[req.businessRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

/**
 * Checks that the user has a specific permission for the current business.
 * Usage: requirePermission('voucher:create')
 */
export function requirePermission(permission) {
  return (req, _res, next) => {
    // Owner and admin bypass permission checks
    if (req.businessRole === ROLES.OWNER || req.businessRole === ROLES.ADMIN) {
      return next();
    }

    if (!req.businessPermissions || !req.businessPermissions.includes(permission)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}
