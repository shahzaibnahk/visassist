import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../ui/Loading';

export default function ProtectedRoute({ children, requiredRole = null, requiredUserType = null, requireAll = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login while preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleAllowed = requiredRole
    ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).includes(user?.role)
    : false;

  const userTypeAllowed = requiredUserType
    ? (Array.isArray(requiredUserType) ? requiredUserType : [requiredUserType]).includes(user?.user_type)
    : false;

  if (requiredRole || requiredUserType) {
    const hasRoleConstraint = !!requiredRole;
    const hasUserTypeConstraint = !!requiredUserType;

    const isAllowed = requireAll
      ? (!hasRoleConstraint || roleAllowed) && (!hasUserTypeConstraint || userTypeAllowed)
      : roleAllowed || userTypeAllowed;

    if (!isAllowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
