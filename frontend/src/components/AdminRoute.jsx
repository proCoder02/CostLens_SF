import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

/**
 * AdminRoute — wraps a route and redirects non-admin users.
 * Must be used inside a ProtectedRoute (assumes user is already authenticated).
 */
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  // Not an admin — show access denied instead of a blank 403 error page
  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center">
          <Shield size={24} className="text-accent-amber" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-1">Admin Access Required</h2>
          <p className="text-sm text-white/40 max-w-xs">
            You don't have permission to view this page. Contact your administrator to request access.
          </p>
        </div>
        <Navigate to="/app" replace state={{ from: location }} />
      </div>
    );
  }

  return children;
}
