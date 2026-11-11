import { Request, Response, NextFunction } from 'express';
import { currentTenant } from './tenantContext';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // currentTenant() is populated securely by tenantMiddleware using the DB
      const { role } = currentTenant();
      
      if (!allowedRoles.includes(role)) {
        res.status(403).json({ 
          error: 'forbidden', 
          detail: `This action requires one of these roles: ${allowedRoles.join(', ')}` 
        });
        return;
      }
      
      next();
    } catch (err) {
      res.status(500).json({ error: 'role_check_failed' });
    }
  };
}