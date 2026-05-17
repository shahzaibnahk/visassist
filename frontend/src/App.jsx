import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import OperationsLogin from './pages/auth/OperationsLogin';
import FinanceLogin from './pages/auth/FinanceLogin';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/Dashboard';
import CountrySelection from './pages/CountrySelection';
import Applications from './pages/Applications';
import ApplicationForm from './pages/ApplicationForm';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import SalesDashboard from './pages/admin/SalesDashboard';
import OperationsDashboard from './pages/operations/Dashboard';
import FinanceDashboard from './pages/finance/Dashboard';
import ChatWidget from './features/chatbot/ChatWidget';

function App() {
  const location = useLocation();
  const showChatWidget = location.pathname === '/';

  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
        </Route>

        {/* Auth Routes - redirect to dashboard if already logged in */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/operations/login" element={
          <PublicRoute>
            <OperationsLogin />
          </PublicRoute>
        } />
        <Route path="/finance/login" element={
          <PublicRoute>
            <FinanceLogin />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />

        {/* Protected Routes - require authentication */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="countries" element={
            <ProtectedRoute>
              <CountrySelection />
            </ProtectedRoute>
          } />
          <Route path="applications" element={
            <ProtectedRoute>
              <Applications />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="application/new" element={
            <ProtectedRoute>
              <ApplicationForm />
            </ProtectedRoute>
          } />
        </Route>

        {/* Admin Routes - require admin role */}
        <Route path="/admin" element={<Layout />}>
          <Route index element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* Sales Routes - use shared header/footer layout */}
        <Route path="/sales" element={<Layout />}>
          <Route index element={
            <ProtectedRoute requiredUserType={["sales"]} requiredRole={["admin", "sales"]}>
              <SalesDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* Operations Routes - strict role + user type access */}
        <Route path="/operations" element={<Layout />}>
          <Route index element={
            <ProtectedRoute
              requiredRole={["operation", "operations"]}
              requiredUserType={["operation", "operations"]}
              requireAll
            >
              <OperationsDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* Finance Routes - strict role + user type access */}
        <Route path="/finance" element={<Layout />}>
          <Route index element={
            <ProtectedRoute
              requiredRole={["finance"]}
              requiredUserType={["finance"]}
              requireAll
            >
              <FinanceDashboard />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>

      {/* ChatWidget for authenticated users and landing page */}
      {showChatWidget && <ChatWidget />}
    </AuthProvider>
  );
}

export default App;
