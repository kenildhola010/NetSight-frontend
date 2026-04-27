import { Navigate, Outlet } from 'react-router-dom';

interface PublicRouteProps {
    children?: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');

    if (userData) {
        try {
            const parsed = JSON.parse(userData);
            // If logged in, redirect away from public pages
            if (parsed?.user?.setupCompleted) {
                return <Navigate to="/app" replace />;
            } else {
                return <Navigate to="/setup" replace />;
            }
        } catch {
            // If data is corrupt, stay on public page (clear it first or just proceed)
            localStorage.removeItem('user');
        }
    }

    // If not logged in, render the login/signup page
    return children ? <>{children}</> : <Outlet />;
};
