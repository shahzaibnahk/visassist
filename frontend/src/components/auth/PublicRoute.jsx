import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../ui/Loading';

export default function PublicRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user?.role === 'sales' || user?.user_type === 'sales') {
      return <Navigate to="/sales" replace />;
    }
    if (
      (user?.role === 'operation' || user?.role === 'operations') &&
      (user?.user_type === 'operation' || user?.user_type === 'operations')
    ) {
      return <Navigate to="/operations" replace />;
    }
    if (user?.role === 'finance' && user?.user_type === 'finance') {
      return <Navigate to="/finance" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
