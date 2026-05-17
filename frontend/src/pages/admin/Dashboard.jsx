import { Users, FileText, CheckCircle, TrendingUp, Eye, Search, BarChart3, Settings, Activity, DollarSign } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { STATUS_COLORS } from '../../utils/constants';
import api from '../../services/api';
import Loading from '../../components/ui/Loading';
import AdminUsers from './Users';
import AdminAnalytics from './Analytics';
import AdminApplications from './AdminApplications';
import AdminAuditLogs from './AdminAuditLogs';
import AdminSalesLeads from './AdminSalesLeads';
import AdminOperations from './AdminOperations';
import AdminFinanceApproval from './AdminFinanceApproval';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [stats, setStats] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'operations', label: 'Operations', icon: Settings },
    { id: 'finance', label: 'Finance Approval', icon: DollarSign },
    { id: 'audit', label: 'Audit Logs', icon: Activity },
  ];

  // Prevent non-admin users from accessing admin dashboard
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAdminData();
    }
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await api.get('/admin/stats');
      const statsData = statsRes.data;
      
      setStats([
        { 
          label: 'Total Users', 
          value: statsData.total_users.toLocaleString(), 
          change: statsData.changes.users, 
          icon: Users, 
          color: 'text-blue-600 bg-blue-50' 
        },
        { 
          label: 'Total Applications', 
          value: statsData.total_applications.toLocaleString(), 
          change: statsData.changes.applications, 
          icon: FileText, 
          color: 'text-green-600 bg-green-50' 
        },
        { 
          label: 'Final Approved', 
          value: statsData.approved_applications.toLocaleString(), 
          change: statsData.changes.approved, 
          icon: CheckCircle, 
          color: 'text-purple-600 bg-purple-50' 
        },
        { 
          label: 'Success Rate', 
          value: `${statsData.success_rate}%`, 
          change: statsData.changes.success_rate, 
          icon: TrendingUp, 
          color: 'text-yellow-600 bg-yellow-50' 
        },
      ]);

      // Fetch users
      const usersRes = await api.get('/admin/users');
      setRecentUsers(usersRes.data.users);

      // Fetch applications
      const appsRes = await api.get('/admin/applications');
      setRecentApplications(appsRes.data.applications);

    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = (recentUsers || []).filter(
    (user) =>
      (user.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredApplications = (recentApplications || []).filter(
    (app) =>
      (app.user_name || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.country || '').toLowerCase().includes(appSearch.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading && activeTab === 'overview') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and oversee visa applications</p>
        </div>

        {/* Tab Navigation - Always visible */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'applications' && <AdminApplications />}
        {activeTab === 'sales' && <AdminSalesLeads />}
        {activeTab === 'operations' && <AdminOperations />}
        {activeTab === 'finance' && <AdminFinanceApproval />}
        {activeTab === 'audit' && <AdminAuditLogs />}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <Card key={idx} hover>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-green-600 font-medium mt-1">{stat.change}</p>
                  </div>
                  <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon size={28} />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Users</h2>
                <Badge variant="primary">{recentUsers.length} users</Badge>
              </div>
              <div className="mt-4">
                <Input
                  icon={Search}
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applications
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="default">{user.applications || 0}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.created_at ? formatDate(user.created_at) : 'N/A'}</td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 hover:text-blue-800 transition-colors">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
                <Badge variant="success">{recentApplications.length} new</Badge>
              </div>
              <div className="mt-4">
                <Input
                  icon={Search}
                  placeholder="Search applications..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{app.user_name}</div>
                            <div className="text-xs text-gray-500">{app.visa_type}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{app.country}</td>
                        <td className="px-6 py-4">
                          <Badge className={STATUS_COLORS[app.status]}>{getStatusLabel(app.status)}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 hover:text-blue-800 transition-colors">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Activity Chart Placeholder */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Application Trends</h2>
          </CardHeader>
          <CardBody>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <TrendingUp size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Chart visualization coming soon</p>
                <p className="text-sm text-gray-500">Integration with charting library in next phase</p>
              </div>
            </div>
          </CardBody>
        </Card>
          </>
        )}
      </div>
    </div>
  );
}
