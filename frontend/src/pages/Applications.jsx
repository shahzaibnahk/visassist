import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  Clock,
  FileText,
  Plus,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Upload,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card, { CardBody, CardFooter } from '../components/ui/Card';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { APPLICATION_STATUS, STATUS_COLORS, COUNTRIES, getApplicationProgress } from '../utils/constants';
import { applicationAPI, applicationAPI_extended } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellingId, setCancellingId] = useState(null);
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationAPI.getAll();
      setApplications(response.data);
    } catch (err) {
      setError('Failed to fetch applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.visa_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredApplications.length / Math.max(1, itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplications = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'processing', label: 'Processing' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'fee_unpaid', label: 'Fee Unpaid' },
    { value: 'fee_verification', label: 'Fee Verification' },
    { value: 'fee_verified', label: 'Fee Verified' },
    { value: 'fee_verification_failed', label: 'Fee Verification Failed' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const getStatusLabel = (status) => {
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handleCancelApplication = async (app) => {
    const confirmed = window.confirm('Cancel this visa application? It will be removed from your active portal list.');
    if (!confirmed) return;

    try {
      setCancellingId(app.id);
      await applicationAPI.cancel(app.id, { cancellation_reason: 'Cancelled by user from client portal' });
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      if (selectedApp?.id === app.id) {
        setIsModalOpen(false);
        setSelectedApp(null);
      }
      alert('Application cancelled successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to cancel application');
    } finally {
      setCancellingId(null);
    }
  };

  const handleUploadPaymentProof = async (e, appId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPaymentProof(true);
      const formData = new FormData();
      formData.append('file', file);

      await applicationAPI_extended.uploadPaymentProof(appId, formData);
      toast.success('Payment proof uploaded successfully! Status changed to fee_verification');

      // Refresh applications
      const response = await applicationAPI.getAll();
      setApplications(response.data);

      // Update selected app
      const updated = response.data.find((a) => a.id === appId);
      if (updated) {
        setSelectedApp(updated);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to upload payment proof');
    } finally {
      setUploadingPaymentProof(false);
    }
  };

  const handleDownloadInvoicePdf = async (appId, invoiceNumber) => {
    try {
      const response = await applicationAPI_extended.downloadInvoicePdf(appId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to download invoice PDF');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Applications</h1>
            <p className="text-gray-600">Track and manage all your visa applications</p>
          </div>
          <Link to="/countries" className="mt-4 md:mt-0">
            <Button>
              <Plus size={20} className="mr-2" />
              New Application
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: applications.length, color: 'bg-blue-50 text-blue-700' },
            {
              label: 'Approved',
              value: applications.filter((a) => a.status === 'approved' || a.status === 'final_approved').length,
              color: 'bg-green-50 text-green-700',
            },
            {
              label: 'Processing',
              value: applications.filter((a) => a.status !== 'approved' && a.status !== 'final_approved' && a.status !== 'rejected' && a.status !== 'final_rejected' && a.status !== 'draft').length,
              color: 'bg-yellow-50 text-yellow-700',
            },
            {
              label: 'Draft',
              value: applications.filter((a) => a.status === 'draft').length,
              color: 'bg-gray-50 text-gray-700',
            },
          ].map((stat, idx) => (
            <Card key={idx}>
              <CardBody className="text-center">
                <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                icon={Search}
                placeholder="Search by country or visa type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : paginatedApplications.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {paginatedApplications.map((app) => (
                <Card key={app.id} hover>
                  <CardBody>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">🌎</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{app.country}</h3>
                          <p className="text-sm text-gray-600">{app.visa_type}</p>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[app.status]}>{getStatusLabel(app.status)}</Badge>
                    </div>

                    {/* Progress Tracker */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{getApplicationProgress(app.status)}%</span>
                      </div>
                      <div className="flex w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 transition-all ${
                            app.status === 'approved'
                              ? 'bg-green-500'
                              : app.status === 'rejected'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${getApplicationProgress(app.status)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <FileText size={14} className="mr-2 flex-shrink-0" />
                        Number: {app.application_number || 'Pending on submission'}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar size={14} className="mr-2 flex-shrink-0" />
                        Submitted: {formatDate(app.submitted_at || app.created_at)}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock size={14} className="mr-2 flex-shrink-0" />
                        Updated: {formatDate(app.updated_at)}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FileText size={14} className="mr-2 flex-shrink-0" />
                        {(app.uploaded_files?.length || app.documents?.length || 0)} documents
                      </div>
                    </div>

                    {app.ai_assistance_used && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg">
                        <span className="font-medium">🤖 AI Assisted</span>
                      </div>
                    )}
                  </CardBody>
                  <CardFooter className="flex gap-2 p-4">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewDetails(app)}>
                      <Eye size={16} className="mr-1" />
                      View Details
                    </Button>
                    {['fee_unpaid', 'fee_verification', 'fee_verified', 'fee_verification_failed'].includes(app.status) && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewDetails(app)}>
                        <DollarSign size={16} className="mr-1" />
                        Invoice
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleCancelApplication(app)}
                      disabled={cancellingId === app.id}
                    >
                      <Trash2 size={16} className="mr-1" />
                      {cancellingId === app.id ? 'Cancelling...' : 'Cancel'}
                    </Button>
                    {app.status === 'approved' && (
                      <Button size="sm" className="flex-1">
                        <Download size={16} className="mr-1" />
                        Download
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                {[...Array(totalPages)].map((_, idx) => (
                  <Button
                    key={idx}
                    variant={currentPage === idx + 1 ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(idx + 1)}
                  >
                    {idx + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-600 mb-6">Start your visa journey by creating a new application</p>
            <Link to="/application">
              <Button>
                <Plus size={20} className="mr-2" />
                Create Application
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Application Details" size="lg">
        {selectedApp && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="text-6xl">🌎</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedApp.country}</h3>
                <p className="text-gray-600">{selectedApp.visa_type}</p>
                <Badge className={`${STATUS_COLORS[selectedApp.status]} mt-2`}>
                  {getStatusLabel(selectedApp.status)}
                </Badge>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">Application Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Application ID</p>
                  <p className="font-medium text-gray-900">{selectedApp.application_number || 'Pending on submission'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium text-gray-900">{getStatusLabel(selectedApp.status)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Submitted Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedApp.submitted_at || selectedApp.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedApp.updated_at)}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">Documents Submitted</h4>
              <div className="space-y-2">
                {(selectedApp.uploaded_files || []).length > 0 ? selectedApp.uploaded_files.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{doc.filename}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(doc.uploaded_at)}</span>
                  </div>
                )) : (selectedApp.documents || []).map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{doc}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download size={16} />
                    </Button>
                  </div>
                ))}
                {((selectedApp.uploaded_files || []).length === 0 && (selectedApp.documents || []).length === 0) && (
                  <p className="text-sm text-gray-500">No uploaded documents yet.</p>
                )}
              </div>
            </div>

            {selectedApp.ai_assistance_used && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  <span className="font-semibold">🤖 AI Assistance Used:</span> This application was created with
                  the help of our AI assistant to ensure accuracy and completeness.
                </p>
              </div>
            )}

            {/* Invoice Section */}
            {(selectedApp.status === 'fee_unpaid' || selectedApp.status === 'fee_verification' || selectedApp.status === 'fee_verified' || selectedApp.status === 'fee_verification_failed') && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Invoice Information
                </h4>
                {selectedApp.invoice_id ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    {selectedApp.status === 'fee_unpaid' && (
                      <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                        <CheckCircle size={18} className="text-green-600" />
                        <span className="text-sm font-medium text-green-700">✓ Invoice generated successfully!</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Invoice Number</p>
                        <p className="font-medium text-gray-900">{selectedApp.invoice_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount</p>
                        <p className="font-medium text-gray-900">${(selectedApp.invoice_amount || 500).toFixed(2)} USD</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Bill ID</p>
                        <p className="font-medium text-gray-900">{selectedApp.invoice_id.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p className="font-medium text-gray-900 capitalize">{selectedApp.status.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadInvoicePdf(selectedApp.id, selectedApp.invoice_number)}
                      >
                        <Download size={16} className="mr-1" />
                        Download Invoice PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Invoice will appear here once generated by finance team.</p>
                )}
              </div>
            )}

            {/* Payment Proof Upload Section */}
            {selectedApp.status === 'fee_unpaid' && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Upload Payment Proof</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 mb-4">
                    Your invoice has been generated. Please upload a screenshot or receipt of your payment to proceed.
                  </p>
                  <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors" style={{ opacity: uploadingPaymentProof ? 0.5 : 1 }}>
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 text-green-600" size={32} />
                      <span className="text-sm text-green-700 font-medium">{uploadingPaymentProof ? 'Uploading...' : 'Click to upload payment proof'}</span>
                      <span className="block text-xs text-green-600 mt-1">PNG, JPG or PDF up to 10MB</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleUploadPaymentProof(e, selectedApp.id)}
                      disabled={uploadingPaymentProof}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Payment Verification Status */}
            {(selectedApp.status === 'fee_verification' || selectedApp.status === 'fee_verified' || selectedApp.status === 'fee_verification_failed') && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Payment Status</h4>
                <div className={`rounded-lg p-4 ${
                  selectedApp.status === 'fee_verified' 
                    ? 'bg-green-50 border border-green-200' 
                    : selectedApp.status === 'fee_verification_failed'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    selectedApp.status === 'fee_verified'
                      ? 'text-green-900'
                      : selectedApp.status === 'fee_verification_failed'
                      ? 'text-red-900'
                      : 'text-yellow-900'
                  }`}>
                    {selectedApp.status === 'fee_verified' && '✓ Payment Verified - Your application can now proceed!'}
                    {selectedApp.status === 'fee_verification_failed' && '✗ Payment Verification Failed - ' + (selectedApp.fee_verification_rejected_reason || 'Please review and resubmit.')}
                    {selectedApp.status === 'fee_verification' && '⏳ Awaiting Verification - Your payment proof is being reviewed.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
          <Button>Edit Application</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
