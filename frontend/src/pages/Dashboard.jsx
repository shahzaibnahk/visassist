import { useNavigate } from 'react-router-dom';
import { FileText, MessageCircle, Phone, Globe, CheckCircle, Clock, XCircle, TrendingUp, User, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ChatWidget from '../features/chatbot/ChatWidget';
import VapiWidget from '../features/chatbot/VapiWidget';
import VoiceCallConfirmation from '../components/modals/VoiceCallConfirmation';
import api from '../services/api';
import { getApplicationProgress } from '../utils/constants';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showVoiceConfirmation, setShowVoiceConfirmation] = useState(false);
  const [showVapiWidget, setShowVapiWidget] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState([]);

  // VAPI Configuration
  const VAPI_API_KEY = 'ba08060b-6af8-436b-addb-ae97a21f4b34';
  const VAPI_ASSISTANT_ID = '4a02e52d-542f-4cc7-9767-7f5aca60428f';

  // Fetch applications and calculate statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/applications');
        const apps = response.data || [];
        setApplications(apps);

        // Calculate statistics from applications
        const approved = apps.filter(app => app.status === 'approved' || app.status === 'final_approved').length;
        const pending = apps.filter(app => app.status !== 'approved' && app.status !== 'final_approved' && app.status !== 'rejected' && app.status !== 'final_rejected').length;
        const rejected = apps.filter(app => app.status === 'rejected' || app.status === 'final_rejected').length;
        const total = apps.length;

        const calculatedStats = [
          {
            label: 'Total Applications',
            value: total.toString(),
            icon: FileText,
            color: 'blue',
            trend: `${approved + pending} in progress`,
          },
          {
            label: 'Approved',
            value: approved.toString(),
            icon: CheckCircle,
            color: 'green',
            trend: approved > 0 ? `${Math.round((approved / total) * 100)}% approval rate` : '0% approval rate',
          },
          {
            label: 'Pending',
            value: pending.toString(),
            icon: Clock,
            color: 'yellow',
            trend: pending > 0 ? 'Awaiting review' : 'No pending applications',
          },
          {
            label: 'Rejected',
            value: rejected.toString(),
            icon: XCircle,
            color: 'red',
            trend: rejected > 0 ? `${Math.round((rejected / total) * 100)}% rejection rate` : 'No rejections',
          },
        ];

        setStats(calculatedStats);
      } catch (error) {
        console.error('Error fetching applications:', error);
        // Set default empty stats
        setStats([
          {
            label: 'Total Applications',
            value: '0',
            icon: FileText,
            color: 'blue',
            trend: 'No applications yet',
          },
          {
            label: 'Approved',
            value: '0',
            icon: CheckCircle,
            color: 'green',
            trend: '0% approval rate',
          },
          {
            label: 'Pending',
            value: '0',
            icon: Clock,
            color: 'yellow',
            trend: 'No pending applications',
          },
          {
            label: 'Rejected',
            value: '0',
            icon: XCircle,
            color: 'red',
            trend: 'No rejections',
          },
        ]);
      }
    };

    fetchData();
  }, []);

  // Prevent admin users from accessing client dashboard
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Mock recent applications - replace with actual API data
  const recentApplications = applications.slice(0, 3).map(app => ({
    id: app.id,
    country: app.country_name || app.country || '🌍 Unknown',
    type: app.visa_type || 'Visa Application',
    status: app.status || 'pending',
    date: new Date(app.created_at).toLocaleDateString(),
  }));

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { variant: 'warning', label: 'Pending' },
      approved: { variant: 'success', label: 'Approved' },
      rejected: { variant: 'danger', label: 'Rejected' },
      under_review: { variant: 'info', label: 'Under Review' },
    };
    const { variant, label } = statusMap[status] || statusMap.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Calculate profile completion percentage
  const profileCompletion = user ? (
    user.profile_completion ?? (
      (user.full_name ? 20 : 0) +
      (user.email ? 20 : 0) +
      (user.phone ? 20 : 0) +
      (user.country ? 20 : 0) +
      (user.avatar ? 20 : 0)
    )
  ) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white py-10 shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                Welcome back, {user?.full_name || 'User'}! 
                <span className="text-3xl">👋</span>
              </h1>
              <p className="text-blue-100 text-lg">
                Track your applications and explore visa opportunities worldwide
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/countries')}
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <FileText size={18} className="mr-2" />
                New Application
              </Button>
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 space-y-10">
        <style>{`
          .dashboard-content > * {
            margin-left: 20px;
            margin-right: 20px;
            padding: 20px;
          }
        `}</style>
        <div className="dashboard-content">
        {profileCompletion < 100 && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <User className="text-yellow-600" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Complete Your Profile
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Complete your profile to unlock all features and improve your application chances
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-md">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-right">
                    {profileCompletion}%
                  </span>
                </div>
              </div>
              <Button 
                variant="primary" 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 border-0 whitespace-nowrap"
                onClick={() => navigate('/profile')}
              >
                Complete Now
              </Button>
            </div>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          {stats.map((stat, index) => {
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-700',
              green: 'bg-green-50 text-green-700',
              orange: 'bg-orange-50 text-orange-700',
              red: 'bg-red-50 text-red-700',
              yellow: 'bg-yellow-50 text-yellow-700',
            };
            return (
              <Card key={index}>
                <CardBody className="text-center py-6">
                  <div className={`text-4xl font-bold mb-2 p-3 rounded-lg mx-auto inline-block ${colorClasses[stat.color] || 'bg-gray-50 text-gray-700'}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">{stat.label}</div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => navigate('/countries')}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="bg-white bg-opacity-20 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <Globe size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">New Application</h3>
                  <p className="text-sm text-blue-100 mt-1">Start your visa journey</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setShowChatWidget(true)}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="bg-white bg-opacity-20 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <MessageCircle size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Chat with AI</h3>
                  <p className="text-sm text-purple-100 mt-1">Get instant answers</p>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setShowVoiceConfirmation(true)}
              className="group relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="bg-white bg-opacity-20 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <Phone size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Call AI Agent</h3>
                  <p className="text-sm text-green-100 mt-1">Speak to an expert</p>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            </button>
          </div>
        </Card>

        {/* Recent Applications */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
            {recentApplications.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/applications')}
                className="hover:scale-105 transition-transform"
              >
                View All
              </Button>
            )}
          </div>

          {recentApplications.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-6">Start your visa application journey today</p>
              <Button 
                onClick={() => navigate('/countries')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 mx-auto"
              >
                <Plus size={18} />
                Create New Application
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300"
                  onClick={() => navigate('/applications')}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl bg-white p-3 rounded-lg shadow-sm">
                      {typeof app.country === 'string' && app.country.includes('🇺') ? app.country.split(' ')[0] : '🌍'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{app.country}</h3>
                      <p className="text-sm text-gray-600 mt-1">{app.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <p className="text-sm text-gray-600">Applied on</p>
                      <p className="text-sm font-medium text-gray-900">{app.date}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(app.status)}
                      <div className="mt-2 w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden ml-auto">
                        <div
                          className="h-1.5 bg-blue-600"
                          style={{ width: `${getApplicationProgress(app.status)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{getApplicationProgress(app.status)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>

      {/* Chat Widget - Controlled component */}
      <ChatWidget isOpenProp={showChatWidget} onCloseProp={() => setShowChatWidget(false)} onOpenProp={() => setShowChatWidget(true)} />

      {/* Voice Call Confirmation Modal */}
      <VoiceCallConfirmation
        isOpen={showVoiceConfirmation}
        onConfirm={() => {
          setShowVoiceConfirmation(false);
          setShowVapiWidget(true);
        }}
        onCancel={() => setShowVoiceConfirmation(false)}
      />

      {/* Vapi Voice Widget */}
      <VapiWidget
        apiKey={VAPI_API_KEY}
        assistantId={VAPI_ASSISTANT_ID}
        isOpen={showVapiWidget}
        onClose={() => setShowVapiWidget(false)}
      />
    </div>
  );
}
