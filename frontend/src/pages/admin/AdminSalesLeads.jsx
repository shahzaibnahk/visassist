import { useState, useEffect } from 'react'
import { Mail, Search, Eye, User, Phone, Calendar, MessageCircle, X, Activity, CheckCircle } from 'lucide-react'
import Card, { CardBody, CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Loading from '../../components/ui/Loading'
import Modal from '../../components/ui/Modal'
import { salesAPI } from '../../services/salesApi'

export default function AdminSalesLeads() {
  const [genericLeads, setGenericLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [communications, setCommunications] = useState([])

  useEffect(() => {
    loadGenericLeads()
  }, [])

  const loadGenericLeads = async () => {
    try {
      setLoading(true)
      const response = await salesAPI.getGenericLeads()
      setGenericLeads(response.data.leads || [])
      setFilteredLeads(response.data.leads || [])
    } catch (error) {
      console.error('Failed to load generic leads', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    const filtered = genericLeads.filter(lead =>
      lead.email?.toLowerCase().includes(query.toLowerCase()) ||
      lead.full_name?.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredLeads(filtered)
  }

  const viewLeadDetails = async (lead) => {
    setSelectedLead(lead)
    setShowModal(true)
    try {
      const commRes = await salesAPI.getLeadCommunications(lead.id)
      setCommunications(commRes.data.communications || [])
    } catch (error) {
      console.error('Failed to load communications', error)
      setCommunications([]) // Gracefully handle 404 or other errors
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Generic Leads</h2>
          <p className="text-gray-600 text-sm mt-1">Users who registered in the system</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <p className="text-sm text-gray-600">Total: <span className="font-bold text-blue-600">{genericLeads.length}</span></p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardBody>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                icon={Search}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">All Generic Leads</h3>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <Loading />
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <Mail size={32} className="mx-auto mb-2 text-gray-400" />
              <p>No generic leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Phone</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Stage</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Registered</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900">{lead.email}</td>
                      <td className="px-6 py-3 text-gray-900">{lead.full_name || '-'}</td>
                      <td className="px-6 py-3 text-gray-900">{lead.phone || '-'}</td>
                      <td className="px-6 py-3">
                        <Badge color={lead.stage === 'new' ? 'blue' : 'green'}>
                          {lead.stage || 'new'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge color={lead.status === 'active' ? 'green' : 'gray'}>
                          {lead.status || 'active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => viewLeadDetails(lead)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md" title="Lead Details">
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedLead.full_name || selectedLead.email}</h2>
              <p className="text-gray-600 text-sm mt-1">{selectedLead.email}</p>
              {selectedLead.phone && <p className="text-gray-600 text-sm">{selectedLead.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Stage</p>
                <p className="text-lg font-semibold text-blue-600 capitalize">{selectedLead.stage || 'new'}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold text-green-600 capitalize">{selectedLead.status || 'active'}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg mb-6">
               <p className="text-sm text-gray-600">Registered Date</p>
               <p className="text-md font-medium text-gray-900">
                 {new Date(selectedLead.created_at).toLocaleDateString(undefined, { 
                   month: 'short', day: 'numeric', year: 'numeric' 
                 })}
               </p>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Communication History</h3>
            {communications.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {communications.map((comm, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 capitalize">{comm.type}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(comm.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                    {comm.subject && <p className="text-gray-700 font-medium">{comm.subject}</p>}
                    {comm.body && <p className="text-gray-600 line-clamp-2 mt-1">{comm.body}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No communication history</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
