import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/api';

export default function AdminFinanceApproval() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadVerifiedApplications();
  }, []);

  const loadVerifiedApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/admin/applications/fee-verified');
      setApplications(res.data?.applications || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
      toast.error('Failed to load verified applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (appId) => {
    try {
      setLoading(true);
      await api.post('/finance/admin/final-approval/approve', {
        application_id: appId,
        status: 'approved',
        approval_notes: '',
      });
      toast.success('Application approved successfully');
      setSelectedApp(null);
      await loadVerifiedApplications();
    } catch (err) {
      console.error('Failed to approve:', err);
      toast.error(err.response?.data?.detail || 'Failed to approve application');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplication = async (appId, reason) => {
    try {
      setLoading(true);
      await api.post('/finance/admin/final-approval/reject', {
        application_id: appId,
        status: 'rejected',
        approval_notes: reason,
      });
      toast.success('Application rejected');
      setRejectionReason('');
      setSelectedApp(null);
      await loadVerifiedApplications();
    } catch (err) {
      console.error('Failed to reject:', err);
      toast.error(err.response?.data?.detail || 'Failed to reject application');
    } finally {
      setLoading(false);
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin">
          <CheckCircle size={32} className="text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h3 className="text-xl font-semibold text-gray-900">Final Fee Approval</h3>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve applications with verified fees
        </p>
      </div>

      {applications.length === 0 ? (
        <Card className="border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No applications pending final approval</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-6 flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{app.application_number}</h4>
                    <Badge className="bg-green-100 text-green-800">FEE VERIFIED</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 truncate">{app.country} • {app.visa_type}</p>
                  <p className="text-sm text-gray-500 mb-3 truncate">User: {app.user_name} • {app.user_email}</p>
                  <div className="p-3 bg-gray-50 rounded text-sm space-y-2">
                    <p className="text-gray-600 truncate">
                      <strong>Finance Notes:</strong> {app.fee_verification_notes || 'No notes'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApproveApplication(app.id)}
                    disabled={loading}
                  >
                    <CheckCircle size={16} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedApp(app)}
                    disabled={loading}
                  >
                    <XCircle size={16} className="mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {selectedApp && (
        <Card className="border border-red-200 bg-red-50 p-4">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">
              Reject {selectedApp.application_number}?
            </h4>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleRejectApplication(selectedApp.id, rejectionReason)}
                disabled={loading || !rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedApp(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}