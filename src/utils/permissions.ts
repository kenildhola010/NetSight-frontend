export type UserRole = 'viewer' | 'engineer' | 'admin' | 'superadmin';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  viewer: [
    '/app',
    '/app/topology',
    '/app/devices',
    '/app/analytics',
    '/app/alerts'
  ],
  engineer: [
    '/app',
    '/app/topology',
    '/app/devices',
    '/app/analytics',
    '/app/prediction',
    '/app/alerts',
    '/app/settings',
    '/setup'
  ],
  admin: [
    '/app',
    '/app/topology',
    '/app/devices',
    '/app/analytics',
    '/app/prediction',
    '/app/alerts',
    '/app/users',
    '/app/settings',
    '/app/audit',
    '/setup'
  ],
  superadmin: [
    '/app',
    '/app/topology',
    '/app/devices',
    '/app/analytics',
    '/app/prediction',
    '/app/alerts',
    '/app/users',
    '/app/settings',
    '/app/audit',
    '/setup'
  ]
};

/**
 * Checks if a user role has permission to access a specific path.
 * @param role The user's role.
 * @param path The requested application path.
 * @returns boolean
 */
export const hasPermission = (role: string | undefined, path: string): boolean => {
  if (!role) return false;
  
  const normalizedRole = role.toLowerCase() as UserRole;
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.viewer;
  
  return permissions.some(p => {
    // 1. Exact match for specific pages (like /app/devices)
    if (path === p) return true;
    
    // 2. Exact match for the base /app dashboard
    if (p === '/app' && path === '/app') return true;
    
    // 3. Prefix matching only for specific sub-resources (e.g., /app/devices/123 matches /app/devices)
    //    But we EXCLUDE the base '/app' from prefix matching so it doesn't match every single page.
    if (p !== '/app' && path.startsWith(p + '/')) return true;
    
    return false;
  });
};
