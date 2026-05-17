import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FileText, Search, Eye, Save, X, RotateCcw, Trash2, Edit2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { getApplicationProgress, getVisaPurposeForType } from '../../utils/constants';

const ASSIGNABLE_ROLES = ['sales', 'operation', 'finance'];
const STATUS_OPTIONS = ['submitted', 'processing', 'under_review', 'reviewed', 'approved', 'rejected'];

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('active');

  const [selectedId, setSelectedId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [popupMode, setPopupMode] = useState('view');

  const [statusForm, setStatusForm] = useState({
    status: 'submitted',
    admin_notes: '',
    assign_to_role: '',
    assign_to_user_id: '',
    assignment_notes: '',
  });
  const [assignees, setAssignees] = useState([]);

  useEffect(() => {
    fetchApplications();
  }, [section]);

  useEffect(() => {
    if (!statusForm.assign_to_role) {
      setAssignees([]);
      setStatusForm((prev) => ({ ...prev, assign_to_user_id: '' }));
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await adminAPI.getUsers({ role: statusForm.assign_to_role, is_active: true, limit: 100 });
        setAssignees(res.data.users || []);
      } catch (err) {
        console.error('Failed to fetch assignees', err);
        setAssignees([]);
      }
    };

    fetchUsers();
  }, [statusForm.assign_to_role]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Show only submitted applications on the active section for admin
      const params = { deleted_only: section === 'deleted' };
      if (section === 'active') params.status = 'submitted';
      const res = await adminAPI.getApplications(params);
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (id) => {
    try {
      setSelectedId(id);
      setModalOpen(true);
      setPopupMode('view');
      setDetailLoading(true);
      const res = await adminAPI.getApplicationById(id);
      const app = res.data;
      setSelectedApp(app);
      setStatusForm({
        status: app.status || 'submitted',
        admin_notes: app.admin_notes || '',
        assign_to_role: app.assigned_to_role || '',
        assign_to_user_id: app.assigned_to_user_id || '',
        assignment_notes: app.assignment_notes || '',
      });
    } catch (err) {
      console.error('Failed to fetch details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!selectedId || section === 'deleted') return;
    try {
      const payload = {
        status: statusForm.status,
        admin_notes: statusForm.admin_notes,
        assign_to_role: statusForm.assign_to_role || null,
        assign_to_user_id: statusForm.assign_to_user_id || null,
        assignment_notes: statusForm.assignment_notes,
      };
      const res = await adminAPI.updateApplicationStatus(selectedId, payload);
      const updated = res.data;

      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === selectedId ? { ...a, ...updated } : a)));
      alert('Application status updated successfully.');
    } catch (err) {
      console.error('Failed to update status', err);
      alert(err.response?.data?.detail || 'Failed to update application status');
    }
  };

  const handleFlushAll = async () => {
    const confirmed = window.confirm('This will permanently remove ALL applications from database. Continue?');
    if (!confirmed) return;

    try {
      const res = await adminAPI.flushApplications();
      setApplications([]);
      setModalOpen(false);
      setSelectedApp(null);
      setSelectedId(null);
      alert(`Flush complete. Deleted ${res.data.deleted_count} applications.`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to flush applications');
    }
  };

  const filteredApps = useMemo(
    () =>
      applications.filter(
        (app) =>
          app.country?.toLowerCase().includes(search.toLowerCase()) ||
          app.user_email?.toLowerCase().includes(search.toLowerCase()) ||
          app.application_number?.toLowerCase().includes(search.toLowerCase())
      ),
    [applications, search]
  );

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-indigo-100 text-indigo-800',
      reviewed: 'bg-emerald-100 text-emerald-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  if (loading) return <div className="p-8 text-center">Loading applications...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-blue-600" /> Applications Management
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSection('active')} className={section === 'active' ? 'border-blue-600 text-blue-700' : ''}>
                <RotateCcw size={16} className="mr-1" /> Active
              </Button>
              <Button variant="outline" onClick={() => setSection('deleted')} className={section === 'deleted' ? 'border-red-600 text-red-700' : ''}>
                <Trash2 size={16} className="mr-1" /> Deleted Applications
              </Button>
              <Button variant="danger" onClick={handleFlushAll}>Flush All Applications</Button>
            </div>
          </div>
          <div className="mt-4">
            <Input
              icon={Search}
              placeholder="Search by app no, country or user email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-gray-500 font-medium">Application No</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">User</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Country / Visa</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Submitted Date</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Assigned To</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{app.application_number || 'Pending'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{app.user_name}</div>
                      <div className="text-gray-500">{app.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{app.country}</div>
                      <div className="text-gray-500">{app.visa_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {app.status?.toUpperCase()}
                      </span>
                      <div className="mt-2 w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 bg-blue-600"
                          style={{ width: `${getApplicationProgress(app.status)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{getApplicationProgress(app.status)}%</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(app.submitted_at || app.created_at)}</td>
                    <td className="px-6 py-4 text-gray-500">{app.assigned_to_role || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800 transition-colors" onClick={() => openDetails(app.id)}>
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredApps.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedApp(null);
          setSelectedId(null);
        }}
        title="Application Details"
        size="xl"
      >
        {detailLoading ? (
          <div className="py-6 text-center text-gray-600">Loading details...</div>
        ) : selectedApp ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Application Number</p>
                <p className="text-lg font-semibold text-gray-900">{selectedApp.application_number || 'Pending'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPopupMode('view')}>
                  <Eye size={16} className="mr-2" /> View
                </Button>
                {section === 'active' && (
                  <Button variant="outline" onClick={() => setPopupMode('edit')}>
                    <Edit2 size={16} className="mr-2" /> Edit
                  </Button>
                )}
              </div>
            </div>

            {popupMode === 'view' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Applicant</p>
                    <p className="font-semibold">{selectedApp.user?.name || selectedApp.user_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-semibold">{selectedApp.user?.email || selectedApp.user_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Submitted Date</p>
                    <p className="font-semibold">{formatDate(selectedApp.submitted_at || selectedApp.created_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Country</p>
                    <p className="font-semibold">{selectedApp.country}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Visa Type</p>
                    <p className="font-semibold">{selectedApp.visa_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-semibold">{selectedApp.status}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Application Progress</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-blue-600" style={{ width: `${getApplicationProgress(selectedApp.status)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{getApplicationProgress(selectedApp.status)}% complete</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Visa Purpose</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded border p-3">
                    {selectedApp.travel_info?.purpose_of_visit || getVisaPurposeForType(selectedApp.visa_type) || 'N/A'}
                  </p>
                </div>

                {selectedApp.personal_info && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Personal Information</h4>
                    <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto">{JSON.stringify(selectedApp.personal_info, null, 2)}</pre>
                  </div>
                )}

                {selectedApp.contact_info && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                    <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto">{JSON.stringify(selectedApp.contact_info, null, 2)}</pre>
                  </div>
                )}

                {selectedApp.travel_info && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Travel Information</h4>
                    <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto">{JSON.stringify(selectedApp.travel_info, null, 2)}</pre>
                  </div>
                )}

                {selectedApp.employment_info && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Employment Information</h4>
                    <div className="bg-gray-50 p-3 rounded border text-sm space-y-1">
                      <p><strong>Status:</strong> {selectedApp.employment_info.employment_status || 'N/A'}</p>
                      {selectedApp.employment_info.employment_status === 'Student' ? (
                        <>
                          <p><strong>Course / Program:</strong> {selectedApp.employment_info.occupation || 'N/A'}</p>
                          <p><strong>University:</strong> {selectedApp.employment_info.institution_name || 'N/A'}</p>
                          <p><strong>University Address:</strong> {selectedApp.employment_info.institution_address || 'N/A'}</p>
                        </>
                      ) : selectedApp.employment_info.employment_status === 'Unemployed' ? (
                        <p><strong>Employment Details:</strong> Not required</p>
                      ) : (
                        <>
                          <p><strong>Occupation:</strong> {selectedApp.employment_info.occupation || 'N/A'}</p>
                          <p><strong>Employer:</strong> {selectedApp.employment_info.employer_name || 'N/A'}</p>
                          <p><strong>Employer Address:</strong> {selectedApp.employment_info.employer_address || 'N/A'}</p>
                        </>
                      )}
                      {selectedApp.employment_info.monthly_income ? <p><strong>Monthly Income:</strong> {selectedApp.employment_info.monthly_income}</p> : null}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Documents</h4>
                  {(selectedApp.uploaded_files || []).length > 0 ? (
                    <ul className="space-y-2">
                      {selectedApp.uploaded_files.map((f, idx) => (
                        <li key={idx} className="text-sm text-gray-700 bg-gray-50 rounded border p-2">{f.filename}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No uploaded documents.</p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded border p-3">{selectedApp.notes || 'No notes submitted'}</p>
                </div>
              </div>
            )}

            {popupMode === 'edit' && section === 'active' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={statusForm.status}
                      onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Role</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={statusForm.assign_to_role}
                      onChange={(e) =>
                        setStatusForm((prev) => ({ ...prev, assign_to_role: e.target.value, assign_to_user_id: '' }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign to User</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={statusForm.assign_to_user_id}
                      onChange={(e) => setStatusForm((prev) => ({ ...prev, assign_to_user_id: e.target.value }))}
                      disabled={!statusForm.assign_to_role}
                    >
                      <option value="">Select user</option>
                      {assignees.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Notes</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={statusForm.assignment_notes}
                      onChange={(e) => setStatusForm((prev) => ({ ...prev, assignment_notes: e.target.value }))}
                      placeholder="Optional pipeline notes"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <textarea
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={statusForm.admin_notes}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
                    placeholder="Add review comments"
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}

        <ModalFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            <X size={16} className="mr-2" /> Close
          </Button>
          {popupMode === 'edit' && section === 'active' && (
            <Button onClick={saveStatus}>
              <Save size={16} className="mr-2" /> Save Status & Assignment
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
