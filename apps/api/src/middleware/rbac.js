import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';
import { VOUCHER_TYPE_MODULE_MAP } from '../config/permissions.js';
import Voucher from '../modules/voucher/voucher.model.js';

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

/**
 * Checks voucher-type-specific permission.
 * For POST (create): reads voucherType from req.body.
 * For PUT/DELETE/cancel on existing voucher: loads voucher from DB.
 * Usage: requireVoucherPermission('write') or requireVoucherPermission('delete')
 */
export function requireVoucherPermission(action) {
  return async (req, _res, next) => {
    // Owner and admin bypass
    if (req.businessRole === ROLES.OWNER || req.businessRole === ROLES.ADMIN) {
      return next();
    }

    try {
      let voucherType;

      if (req.method === 'POST' && !req.params.id) {
        // Creating a new voucher — type is in the body
        voucherType = req.body.voucherType;
      } else if (req.params.id) {
        // Operating on an existing voucher — load it to get the type
        const voucher = await Voucher.findById(req.params.id).select('voucherType businessId').lean();
        if (!voucher) {
          return next(ApiError.notFound('Voucher not found'));
        }
        if (voucher.businessId.toString() !== req.businessId) {
          return next(ApiError.forbidden('No access to this voucher'));
        }
        voucherType = voucher.voucherType;
      }

      if (!voucherType) {
        return next(ApiError.badRequest('Voucher type is required'));
      }

      const module = VOUCHER_TYPE_MODULE_MAP[voucherType];
      if (!module) {
        return next(ApiError.badRequest(`Unknown voucher type: ${voucherType}`));
      }

      const permission = `${module}:${action}`;
      if (!req.businessPermissions || !req.businessPermissions.includes(permission)) {
        return next(ApiError.forbidden('Insufficient permissions'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Require at least one voucher permission for a given action.
 * Used for listing vouchers when no specific type is provided.
 */
export function requireAnyVoucherPermission(action) {
  return (req, _res, next) => {
    // Owner and admin bypass
    if (req.businessRole === ROLES.OWNER || req.businessRole === ROLES.ADMIN) {
      return next();
    }

    const perms = req.businessPermissions || [];
    const hasAny = perms.some((p) => p.endsWith(`:${action}`));
    if (!hasAny) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

/**
 * Require at least one permission for any of the given modules (any action).
 * Useful for shared lookup endpoints (reference data).
 */
export function requireAnyModulePermission(modules = []) {
  return (req, _res, next) => {
    if (req.businessRole === ROLES.OWNER || req.businessRole === ROLES.ADMIN) {
      return next();
    }

    const perms = req.businessPermissions || [];
    const hasAny = perms.some((p) => modules.some((m) => p.startsWith(`${m}:`)));
    if (!hasAny) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}
