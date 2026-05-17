import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, DollarSign, TrendingUp, Users, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { financeAPI, applicationAPI_extended } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function FinanceDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reviewed');
  const [overview, setOverview] = useState(null);
  const [applications, setApplications] = useState([]);
  const [generatingInvoices, setGeneratingInvoices] = useState({});
  const [selectedApps, setSelectedApps] = useState(new Set());

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load overview
      try {
        const res = await financeAPI.getDashboardOverview();
        setOverview(res.data);
      } catch (e) {
        console.error('Failed to load overview:', e);
      }

      // Load applications based on active tab
      let appRes;
      if (activeTab === 'reviewed') {
        appRes = await financeAPI.getReviewedApplications();
      } else if (activeTab === 'unpaid') {
        appRes = await financeAPI.getFeeUnpaidApplications();
      } else if (activeTab === 'verification') {
        appRes = await financeAPI.getFeeVerificationApplications();
      } else if (activeTab === 'verified') {
        appRes = await financeAPI.getFeeVerifiedApplications();
      }

      setApplications(appRes?.data?.applications || []);
    } catch (err) {
      console.error('Error loading finance data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (applicationId, amount = 500) => {
    try {
      setGeneratingInvoices(prev => ({ ...prev, [applicationId]: true }));
      await financeAPI.generateInvoice({
        application_id: applicationId,
        amount: amount,
      });
      toast.success('Invoice generated successfully');
      await loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoices(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleSendInvoice = async (applicationId) => {
    try {
      setGeneratingInvoices(prev => ({ ...prev, [applicationId]: true }));
      await financeAPI.sendInvoice(applicationId);
      toast.success('Invoice sent to user');
      await loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send invoice');
    } finally {
      setGeneratingInvoices(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleBulkGenerateAndSend = async () => {
    if (selectedApps.size === 0) {
      toast.error('Please select at least one application');
      return;
    }

    try {
      setLoading(true);
      const result = await financeAPI.bulkGenerateAndSendInvoices({
        application_ids: Array.from(selectedApps),
        amount: 500,
      });
      toast.success(`Generated: ${result.data.generated}, Sent: ${result.data.sent}`);
      setSelectedApps(new Set());
      await loadDashboardData();
    } catch (err) {
      toast.error('Failed to bulk generate invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (applicationId) => {
    try {
      setLoading(true);
      await financeAPI.approvePaymentVerification({
        application_id: applicationId,
        status: 'approved',
        notes: 'Payment verified by finance officer',
      });
      toast.success('Payment approved');
      await loadDashboardData();
    } catch (err) {
      toast.error('Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async (applicationId, reason) => {
    try {
      setLoading(true);
      await financeAPI.rejectPaymentVerification({
        application_id: applicationId,
        status: 'rejected',
        rejection_reason: reason || 'Payment does not match invoice amount',
      });
      toast.success('Payment rejected');
      await loadDashboardData();
    } catch (err) {
      toast.error('Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPaymentProof = async (applicationId, fallbackFileName) => {
    try {
      const res = await financeAPI.getPaymentProofFile(applicationId);
      const contentType = res.headers?.['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const extension = contentType.includes('pdf') ? 'pdf' : contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'bin';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = fallbackFileName || `payment-proof-${applicationId}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to open payment proof');
    }
  };

  const toggleSelectApp = (appId) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApps(newSelected);
  };

  const handleLogout = () => {
    logout();
    navigate('/finance/login');
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      reviewed: 'bg-emerald-100 text-emerald-800',
      fee_unpaid: 'bg-orange-100 text-orange-800',
      fee_verification: 'bg-purple-100 text-purple-800',
      fee_verified: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-green-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-green-600" size={32} />
              Finance Dashboard
            </h1>
            <p className="text-gray-600 text-sm mt-1">Welcome, {user?.name || 'Finance User'}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ${overview?.total_revenue || 0}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Reviewed Apps</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {overview?.processed_applications || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Pending Verification</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {applications?.filter(a => a.status === 'fee_verification').length || 0}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertCircle className="text-yellow-600" size={24} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ${overview?.monthly_revenue || 0}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'reviewed', label: 'Reviewed Applications', icon: FileText },
            { id: 'unpaid', label: 'Fee Unpaid', icon: AlertCircle },
            { id: 'verification', label: 'Awaiting Verification', icon: CheckCircle },
            { id: 'verified', label: 'Fee Verified', icon: CheckCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {activeTab === 'reviewed' && (
          <div className="mb-4 flex gap-2">
            <Button
              onClick={handleBulkGenerateAndSend}
              disabled={selectedApps.size === 0 || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Generate & Send ({selectedApps.size}) Invoices
            </Button>
            {selectedApps.size > 0 && (
              <Button variant="outline" onClick={() => setSelectedApps(new Set())}>
                Clear Selection
              </Button>
            )}
          </div>
        )}

        {/* Applications List */}
        <div className="space-y-4">
          {applications.length === 0 ? (
            <Card className="border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No applications found</p>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app.id} className="border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {activeTab === 'reviewed' && (
                      <input
                        type="checkbox"
                        checked={selectedApps.has(app.id)}
                        onChange={() => toggleSelectApp(app.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{app.application_number}</h3>
                        <Badge className={getStatusBadgeColor(app.status)}>
                          {app.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {app.country} • {app.visa_type}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        User: {app.user_name || 'Unknown'} • {app.user_email || ''}
                      </p>
                      {app.invoice_number && (
                        <p className="text-sm text-gray-500">Invoice: {app.invoice_number}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    {activeTab === 'reviewed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateInvoice(app.id)}
                          disabled={generatingInvoices[app.id]}
                        >
                          {generatingInvoices[app.id] ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                      </>
                    )}

                    {activeTab === 'unpaid' && (
                      <Button
                        size="sm"
                        onClick={() => handleSendInvoice(app.id)}
                        disabled={generatingInvoices[app.id]}
                      >
                        {generatingInvoices[app.id] ? 'Sending...' : 'Send Invoice'}
                      </Button>
                    )}

                    {activeTab === 'verification' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPaymentProof(app.id, app.payment_proof_id)}
                          disabled={loading}
                        >
                          View Paid Invoice
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprovePayment(app.id)}
                          disabled={loading}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectPayment(app.id)}
                          disabled={loading}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {activeTab === 'verified' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPaymentProof(app.id, app.payment_proof_id)}
                        >
                          View Paid Invoice
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download size={16} />
                          Export
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
