import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Plane, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // Public navigation links
  const publicLinks = [
    { path: '/', label: 'Home' },
  ];

  // Authenticated navigation links for regular users
  const authLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/profile', label: 'Profile' },
    { path: '/countries', label: 'Countries' },
    { path: '/applications', label: 'My Applications' },
  ];

  // Admin navigation links
  const adminLinks = [
    { path: '/admin', label: 'Admin Dashboard' },
  ];

  // Sales navigation links
  const salesLinks = [
    { path: '/sales', label: 'Sales Dashboard' },
  ];

  // Operations navigation links
  const operationsLinks = [
    { path: '/operations', label: 'Operations Dashboard' },
  ];

  // Finance navigation links
  const financeLinks = [
    { path: '/finance', label: 'Finance Dashboard' },
  ];

  // Determine which links to show based on user role
  const navLinks = isAuthenticated
    ? user?.role === 'admin'
      ? adminLinks  // Show only admin links for admin users
      : (user?.role === 'sales' || user?.user_type === 'sales')
        ? salesLinks // Show only sales link for sales users
        : ((user?.role === 'operation' || user?.role === 'operations')
          && (user?.user_type === 'operation' || user?.user_type === 'operations'))
          ? operationsLinks // Show operations link for operations users
        : (user?.role === 'finance' && user?.user_type === 'finance')
          ? financeLinks // Show finance link for finance users
        : authLinks  // Show only client links for regular users
    : publicLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Plane className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-gray-900">VissaAssist</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={20} />
                  <span className="text-sm font-medium">{user?.full_name || 'User'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} className="mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 space-y-2">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 text-gray-700 border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-2 mb-3">
                      <User size={20} />
                      <span className="text-sm font-medium">{user?.full_name || 'User'}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} className="mr-1" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { navigate('/login'); setIsOpen(false); }}>
                    Sign In
                  </Button>
                  <Button size="sm" className="w-full" onClick={() => { navigate('/signup'); setIsOpen(false); }}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
