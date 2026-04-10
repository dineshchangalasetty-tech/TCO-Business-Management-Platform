import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export type UserRole = 'admin' | 'analyst' | 'viewer';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  analyst: 2,
  viewer: 1,
};

/** Map Azure AD app role claim values to internal roles */
const AZURE_ROLE_MAP: Record<string, UserRole> = {
  'CostDashboard.Admin': 'admin',
  'CostDashboard.Analyst': 'analyst',
  'CostDashboard.Viewer': 'viewer',
};

/**
 * Extract the highest-privilege role from the user's Azure AD token claims.
 */
function getUserRole(req: Request): UserRole | null {
  const azureRoles = req.user?.roles ?? [];
  let highestRole: UserRole | null = null;
  let highestLevel = 0;

  for (const azureRole of azureRoles) {
    const mappedRole = AZURE_ROLE_MAP[azureRole];
    if (mappedRole && ROLE_HIERARCHY[mappedRole] > highestLevel) {
      highestRole = mappedRole;
      highestLevel = ROLE_HIERARCHY[mappedRole];
    }
  }

  return highestRole;
}

/**
 * Middleware factory — require minimum role level to access a route.
 * @param requiredRole - The minimum role required
 */
export function requireRole(requiredRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userRole = getUserRole(req);

    if (!userRole) {
      logger.warn('User has no recognized role', {
        userId: req.user.oid,
        azureRoles: req.user.roles,
      });
      next(new ForbiddenError('No recognized role assigned to this user'));
      return;
    }

    const userLevel = ROLE_HIERARCHY[userRole];
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    if (userLevel < requiredLevel) {
      logger.warn('Access denied — insufficient role', {
        userId: req.user.oid,
        userRole,
        requiredRole,
      });
      next(new ForbiddenError(`Requires ${requiredRole} role or higher`));
      return;
    }

    // Attach resolved role to request for downstream use
    (req as Request & { userRole: UserRole }).userRole = userRole;
    next();
  };
}

/** Convenience role guards */
export const requireAdmin = requireRole('admin');
export const requireAnalyst = requireRole('analyst');
export const requireViewer = requireRole('viewer');
