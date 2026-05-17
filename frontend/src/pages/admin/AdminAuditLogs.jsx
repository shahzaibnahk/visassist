import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Activity, Clock, Eye, X } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAuditLogs();
      setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('LOGIN') || action.includes('SIGNUP')) return 'text-green-600 bg-green-100';
    if (action.includes('UPLOAD')) return 'text-purple-600 bg-purple-100';
    if (action.includes('UPDATE')) return 'text-yellow-600 bg-yellow-100';
    if (action.includes('SUBMIT')) return 'text-blue-600 bg-blue-100';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-100';
    if (action.startsWith('API_CALL')) return 'text-indigo-600 bg-indigo-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading) return <div className="p-8 text-center">Loading audit logs...</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="text-indigo-600" /> System Audit Logs
            </h2>
            <div className="flex items-center gap-2">
               <Badge variant="primary">{logs.length} logs captured</Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm text-left min-w-0">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-gray-500 font-medium">Date & Time</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Action</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Entity</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Details</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 flex items-center gap-2 min-w-0">
                      <Clock size={14} className="text-gray-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700 truncate max-w-[160px]">
                      <div className="truncate">{log.entity_type}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap truncate max-w-[320px]">
                      <div className="truncate">{log.details.length > 120 ? log.details.substring(0, 120) + "..." : log.details}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Full Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No activity logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      
      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold flex items-center gap-2">
                Log Details: <span className={`px-2 py-1 rounded-md text-sm font-semibold ${getActionColor(selectedLog.action)}`}>{selectedLog.action}</span>
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Properties column */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">Time</h4>
                  <p className="text-sm text-gray-600">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">Entity</h4>
                  <p className="text-sm text-gray-600">{selectedLog.entity_type} {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">User ID</h4>
                  <p className="text-sm text-gray-600">{selectedLog.user_id || 'Anonymous/System'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">IP Address</h4>
                  <p className="text-sm text-gray-600">{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">Message Detail</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">{selectedLog.details}</p>
                </div>
              </div>
              
              {/* Payloads column */}
              <div className="space-y-4 h-full overflow-hidden flex flex-col gap-4">
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">Request Data</h4>
                  <div className="flex-1 bg-gray-900 rounded-md p-3 overflow-auto">
                    <pre className="text-xs text-green-400 font-mono m-0 whitespace-pre-wrap">
                      {selectedLog.request_data 
                        ? JSON.stringify(selectedLog.request_data, null, 2) 
                        : "No request data recorded"}
                    </pre>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">Response Data</h4>
                  <div className="flex-1 bg-gray-900 rounded-md p-3 overflow-auto">
                    <pre className="text-xs text-blue-400 font-mono m-0 whitespace-pre-wrap">
                      {selectedLog.response_data 
                        ? JSON.stringify(selectedLog.response_data, null, 2) 
                        : "No response data recorded"}
                    </pre>
                  </div>
                </div>
              </div>
              
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}