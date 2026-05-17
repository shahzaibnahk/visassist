import { useEffect, useState } from 'react';
import { operationsAPI } from '../../services/api';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { Search, FileText } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';

export default function AdminOperations() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompleted();
  }, []);

  const fetchCompleted = async () => {
    try {
      setLoading(true);
      const res = await operationsAPI.getFinalizedApplications();
      setApplications(res.data.applications || []);
    } catch (error) {
      console.error('Failed to fetch operations applications', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = applications.filter((app) => {
    const q = search.toLowerCase();
    return (
      (app.application_number || '').toLowerCase().includes(q) ||
      (app.user_name || '').toLowerCase().includes(q) ||
      (app.user_email || '').toLowerCase().includes(q) ||
      (app.country || '').toLowerCase().includes(q)
    );
  });

  const getStatusLabel = (status = '') =>
    status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Operations Queue History</h2>
          <Badge variant="primary">{filtered.length} items</Badge>
        </div>
        <Input
          icon={Search}
          placeholder="Search by app no, user or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </CardHeader>
      <CardBody className="p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-gray-500 font-medium">Application No</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Applicant</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Country / Visa</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Final Status</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Reviewed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((app) => (
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800'}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(app.reviewed_at || app.updated_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={24} />
                        <span>No reviewed/rejected applications found.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
