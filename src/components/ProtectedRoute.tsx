import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

interface ProtectedRouteProps {
    children?: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const location = useLocation();
    
    // Check if user is logged in
    const userData = localStorage.getItem('user');

    if (!userData) {
        // Redirect to login page if not authenticated
        return <Navigate to="/login" replace />;
    }

    try {
        const parsed = JSON.parse(userData);
        const user = parsed?.user;

        if (!user) {
            throw new Error('Invalid user data');
        }

        // 1. Check if setup is completed
        if (!user.setupCompleted && location.pathname !== '/setup') {
            return <Navigate to="/setup" replace />;
        }

        // 2. Check Role-Based Permissions
        // If they are logged in but trying to access a path they don't have permission for
        if (location.pathname !== '/setup' && !hasPermission(user.role, location.pathname)) {
            console.warn(`Access denied for role ${user.role} to ${location.pathname}`);
            return <Navigate to="/app" replace />;
        }

    } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }

    // If all checks pass, render children or Outlet
    return children ? <>{children}</> : <Outlet />;
};
