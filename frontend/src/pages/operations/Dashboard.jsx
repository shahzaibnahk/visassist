import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, CheckCircle2, XCircle, FileText, RefreshCw, ArrowRight } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { STATUS_COLORS } from '../../utils/constants';
import { operationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { id: 'applications', label: 'Applications (Processing)' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'completed', label: 'Reviewed / Rejected' },
];

const getStatusLabel = (status = '') =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

export default function OperationsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('applications');
  const [processingApps, setProcessingApps] = useState([]);
  const [underReviewApps, setUnderReviewApps] = useState([]);
  const [completedApps, setCompletedApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [selectedApp, setSelectedApp] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verificationStep, setVerificationStep] = useState('personal');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'applications') {
        const res = await operationsAPI.getProcessingApplications();
        setProcessingApps(res.data.applications || []);
      } else if (activeTab === 'under_review') {
        const res = await operationsAPI.getUnderReviewApplications();
        setUnderReviewApps(res.data.applications || []);
      } else {
        const res = await operationsAPI.getFinalizedApplications();
        setCompletedApps(res.data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentList = useMemo(() => {
    if (activeTab === 'applications') return processingApps;
    if (activeTab === 'under_review') return underReviewApps;
    return completedApps;
  }, [activeTab, processingApps, underReviewApps, completedApps]);

  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return currentList;
    return currentList.filter((app) => {
      return (
        (app.application_number || '').toLowerCase().includes(q) ||
        (app.user_name || '').toLowerCase().includes(q) ||
        (app.user_email || '').toLowerCase().includes(q) ||
        (app.country || '').toLowerCase().includes(q) ||
        (app.visa_type || '').toLowerCase().includes(q)
      );
    });
  }, [currentList, search]);

  const handleMoveAllToUnderReview = async () => {
    const confirmed = window.confirm('Move all processing applications to under review?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await operationsAPI.moveAllToUnderReview({ admin_notes: 'Bulk moved by operations' });
      await fetchTabData();
      alert('All processing applications moved to under review.');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || 'Failed to move all applications.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveSingleToUnderReview = async (appId) => {
    try {
      setActionLoading(true);
      await operationsAPI.moveToUnderReview(appId, { admin_notes: 'Moved to under review by operations' });
      await fetchTabData();
      alert('Application moved to under review.');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || 'Failed to move application.');
    } finally {
      setActionLoading(false);
    }
  };

  const openVerification = async (appId) => {
    try {
      setDetailsLoading(true);
      const res = await operationsAPI.getApplicationById(appId);
      setSelectedApp(res.data);
      setVerificationStep('personal');
      setAdminNotes('');
      setRejectionReason('');
      setIsVerifyModalOpen(true);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || 'Failed to load application details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenDocument = async (docIndex) => {
    if (!selectedApp) return;
    try {
      const res = await operationsAPI.getDocumentBlob(selectedApp.id, docIndex);
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || 'Failed to open document preview.');
    }
  };

  const finalizeReview = async (status) => {
    if (!selectedApp) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      alert('Please provide rejection reason.');
      return;
    }

    try {
      setActionLoading(true);
      await operationsAPI.finalizeApplication(selectedApp.id, {
        status,
        admin_notes: adminNotes,
        rejection_reason: rejectionReason,
      });
      setIsVerifyModalOpen(false);
      setSelectedApp(null);
      await fetchTabData();
      alert(status === 'reviewed' ? 'Application verified and marked reviewed.' : 'Application rejected successfully.');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || 'Failed to finalize application.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Operations Dashboard</h1>
          <p className="text-gray-600">Verify personal details and documents before final decision. Signed in as {user?.full_name || 'Operations User'}.</p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-xl">
                <Input
                  icon={Search}
                  placeholder="Search by application no, user, country or visa type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchTabData}>
                  <RefreshCw size={16} className="mr-2" />
                  Refresh
                </Button>
                {activeTab === 'applications' && (
                  <Button onClick={handleMoveAllToUnderReview} disabled={actionLoading || processingApps.length === 0}>
                    Move All to Under Review
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading || detailsLoading ? (
              <div className="p-8 text-center text-gray-600">Loading applications...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-gray-500 font-medium">Application No</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">Applicant</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">Country / Visa</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">Status</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">Updated</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredList.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{app.application_number || 'Pending'}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{app.user_name || 'Unknown'}</div>
                          <div className="text-gray-500">{app.user_email || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{app.country || 'N/A'}</div>
                          <div className="text-gray-500">{app.visa_type || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={STATUS_COLORS[app.status] || ''}>{getStatusLabel(app.status)}</Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(app.updated_at)}</td>
                        <td className="px-6 py-4">
                          {activeTab === 'applications' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMoveSingleToUnderReview(app.id)}
                                disabled={actionLoading}
                              >
                                <ArrowRight size={15} className="mr-1" />
                                Move
                              </Button>
                            </div>
                          )}

                          {activeTab === 'under_review' && (
                            <Button
                              size="sm"
                              onClick={() => openVerification(app.id)}
                              disabled={actionLoading}
                            >
                              <Eye size={15} className="mr-1" />
                              Verify
                            </Button>
                          )}

                          {activeTab === 'completed' && (
                            <Button size="sm" variant="outline" onClick={() => openVerification(app.id)}>
                              <Eye size={15} className="mr-1" />
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredList.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                          No applications available in this page.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setSelectedApp(null);
        }}
        title="Application Verification"
        size="xl"
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border rounded-lg p-4 bg-gray-50">
              <div>
                <p className="text-sm text-gray-500">Application Number</p>
                <p className="text-lg font-semibold text-gray-900">{selectedApp.application_number || 'Pending'}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedApp.user?.name || selectedApp.user_name || 'Unknown'} • {selectedApp.country || 'N/A'} • {selectedApp.visa_type || 'N/A'}</p>
              </div>
              <Badge className={STATUS_COLORS[selectedApp.status] || ''}>{getStatusLabel(selectedApp.status)}</Badge>
            </div>

            {selectedApp.status === 'under_review' && (
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant={verificationStep === 'personal' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setVerificationStep('personal')}
                >
                  1. Personal Verification
                </Button>
                <Button
                  variant={verificationStep === 'documents' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setVerificationStep('documents')}
                >
                  2. Document Verification
                </Button>
              </div>
            )}

            {/* Full application view: personal, contact, travel, employment, history, documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Application Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="border rounded-lg p-3">
                  <p className="text-gray-500">Full Name</p>
                  <p className="font-semibold text-gray-900">
                    {selectedApp.personal_info?.first_name || ''} {selectedApp.personal_info?.middle_name || ''} {selectedApp.personal_info?.last_name || ''}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-gray-500">Date of Birth</p>
                  <p className="font-semibold text-gray-900">{selectedApp.personal_info?.date_of_birth || 'N/A'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-gray-500">Passport Number</p>
                  <p className="font-semibold text-gray-900">{selectedApp.personal_info?.passport_number || 'N/A'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-gray-500">Nationality</p>
                  <p className="font-semibold text-gray-900">{selectedApp.personal_info?.nationality || 'N/A'}</p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-gray-500">Email</p>
                  <p className="font-semibold text-gray-900">{selectedApp.contact_info?.email || selectedApp.user?.email || 'N/A'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-900">{selectedApp.contact_info?.phone || selectedApp.user?.phone || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Travel Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p><strong>Purpose:</strong> {selectedApp.travel_info?.purpose_of_visit || selectedApp.visa_type}</p>
                  <p><strong>Arrival:</strong> {selectedApp.travel_info?.intended_arrival_date || 'N/A'}</p>
                  <p><strong>Departure:</strong> {selectedApp.travel_info?.intended_departure_date || 'N/A'}</p>
                  <p><strong>Duration:</strong> {selectedApp.travel_info?.duration_of_stay || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Employment Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p><strong>Status:</strong> {selectedApp.employment_info?.employment_status || 'N/A'}</p>
                  {selectedApp.employment_info?.employment_status === 'Student' ? (
                    <>
                      <p><strong>Course / Program:</strong> {selectedApp.employment_info?.occupation || 'N/A'}</p>
                      <p><strong>University:</strong> {selectedApp.employment_info?.institution_name || 'N/A'}</p>
                    </>
                  ) : selectedApp.employment_info?.employment_status === 'Unemployed' ? (
                    <p><strong>Employment Details:</strong> Not required</p>
                  ) : (
                    <>
                      <p><strong>Occupation:</strong> {selectedApp.employment_info?.occupation || 'N/A'}</p>
                      <p><strong>Employer:</strong> {selectedApp.employment_info?.employer_name || 'N/A'}</p>
                    </>
                  )}
                  {selectedApp.employment_info?.monthly_income ? <p><strong>Monthly Income:</strong> {selectedApp.employment_info.monthly_income}</p> : null}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Education History</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  {(selectedApp.education_history || []).length > 0 ? (
                    <ul className="list-disc list-inside">
                      {selectedApp.education_history.map((ed, i) => (
                        <li key={i}>{ed.institution || ed.degree || JSON.stringify(ed)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No education history provided.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Employment History</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  {(selectedApp.employment_history || []).length > 0 ? (
                    <ul className="list-disc list-inside">
                      {selectedApp.employment_history.map((eh, i) => (
                        <li key={i}>{eh.company_name || eh.job_title || JSON.stringify(eh)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No employment history provided.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Uploaded Documents</h4>
                {(selectedApp.uploaded_files || []).length > 0 ? (
                  <div className="space-y-2">
                    {selectedApp.uploaded_files.map((doc, idx) => (
                      <div key={idx} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{doc.filename || `Document ${idx + 1}`}</p>
                          <p className="text-xs text-gray-500">Uploaded: {formatDate(doc.uploaded_at)}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleOpenDocument(idx)}>
                          <FileText size={15} className="mr-1" />
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 border rounded-lg p-4 bg-gray-50">
                    No uploaded documents found for this application.
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Applicant Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p>{selectedApp.notes || 'No notes submitted'}</p>
                </div>
              </div>

              {selectedApp.status === 'under_review' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operations Notes</label>
                    <textarea
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add verification notes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (required for rejection)</label>
                    <textarea
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this application is rejected"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsVerifyModalOpen(false)}>Close</Button>
          {selectedApp?.status === 'under_review' && verificationStep === 'documents' && (
            <>
              <Button
                variant="danger"
                onClick={() => finalizeReview('rejected')}
                disabled={actionLoading}
              >
                <XCircle size={16} className="mr-2" />
                Final Reject
              </Button>
              <Button onClick={() => finalizeReview('reviewed')} disabled={actionLoading}>
                <CheckCircle2 size={16} className="mr-2" />
                Final Verify
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
