import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Mail, Send, Users, TrendingUp, MessageCircle, Calendar, CheckCircle, Clock, Phone, Filter, X, Plus } from 'lucide-react'
import { salesAPI } from '../../services/salesApi'
import Card, { CardBody, CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Loading from '../../components/ui/Loading'
import Modal from '../../components/ui/Modal'

export default function SalesDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [leads, setLeads] = useState([])
  const [genericLeads, setGenericLeads] = useState([])
  const [draftApplications, setDraftApplications] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [filteredDraftApplications, setFilteredDraftApplications] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  
  // Email campaign state
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [sending, setSending] = useState(false)
  const [followUpSubject, setFollowUpSubject] = useState('')
  const [followUpBody, setFollowUpBody] = useState('')
  const [selectedDraftRecipients, setSelectedDraftRecipients] = useState(new Set())
  
  // Filters
  const [stageFilter, setStageFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [draftSearch, setDraftSearch] = useState('')
  
  // Selected lead details
  const [selectedLead, setSelectedLead] = useState(null)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [communications, setCommunications] = useState([])
  const [followUps, setFollowUps] = useState([])
  const canAccessSales = user?.user_type === 'sales' || user?.role === 'sales' || user?.role === 'admin'
  
  // Check access - sales users and admins can access
  useEffect(() => {
    if (user && !canAccessSales) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, canAccessSales, navigate])

  // Load leads for all tabs, including the initial Overview tab.
  useEffect(() => {
    if (user && canAccessSales) {
      loadLeads()
    }
  }, [user, canAccessSales, activeTab, stageFilter, sourceFilter])

  const loadLeads = async () => {
    try {
      setLoading(true)
      let response
      
      if (activeTab === 'generic') {
        response = await salesAPI.getGenericLeads()
        const items = response.data.leads || []
        setGenericLeads(items)
        setLeads(items)
      } else if (activeTab === 'applications') {
        response = await salesAPI.getDraftApplications()
        const items = response.data.applications || []
        setDraftApplications(items)
        setFilteredDraftApplications(items)
      } else {
        response = await salesAPI.getLeads(stageFilter !== 'all' ? stageFilter : null, sourceFilter !== 'all' ? sourceFilter : null)
        setLeads(response.data.leads || [])
      }
      
      // Apply search filter
      if (activeTab === 'applications') {
        const filtered = (response.data.applications || []).filter(app => 
          app.user_email?.toLowerCase().includes(draftSearch.toLowerCase()) ||
          app.user_name?.toLowerCase().includes(draftSearch.toLowerCase()) ||
          app.country?.toLowerCase().includes(draftSearch.toLowerCase()) ||
          app.visa_type?.toLowerCase().includes(draftSearch.toLowerCase())
        )
        setFilteredDraftApplications(filtered)
      } else {
        const filtered = response.data.leads?.filter(lead => 
          lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        ) || []
        setFilteredLeads(filtered)
      }
      
      // Calculate stats
      const statsSource = response.data.leads || response.data.applications || []
      if (statsSource.length > 0 && activeTab !== 'applications') {
        const stages = {}
        const sources = {}
        
        statsSource.forEach(lead => {
          stages[lead.stage] = (stages[lead.stage] || 0) + 1
          sources[lead.source] = (sources[lead.source] || 0) + 1
        })
        
        setStats({
          total: response.data.total || 0,
          byStage: stages,
          bySources: sources,
          activeLeads: response.data.leads.filter(l => l.status === 'active').length,
          completedLeads: response.data.leads.filter(l => l.stage === 'completed').length
        })
      }
    } catch (error) {
      console.error('Failed to load leads', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLeadDetails = async (leadId) => {
    try {
      const leadRes = await salesAPI.getLeadDetails(leadId)
      setSelectedLead(leadRes.data)
      
      const commRes = await salesAPI.getLeadCommunications(leadId)
      setCommunications(commRes.data.communications || [])
      
      const followUpRes = await salesAPI.getLeadFollowUps(leadId)
      setFollowUps(followUpRes.data.follow_ups || [])
      
      setShowLeadModal(true)
    } catch (error) {
      console.error('Failed to load lead details', error)
    }
  }

  const toggleSelect = (email) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const selectAll = () => {
    const all = new Set(filteredLeads.map(l => l.email))
    setSelected(all)
  }

  const clearAll = () => setSelected(new Set())

  const toggleDraftSelect = (email) => {
    setSelectedDraftRecipients(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const selectAllDrafts = () => {
    const all = new Set(filteredDraftApplications.map(app => app.user_email).filter(Boolean))
    setSelectedDraftRecipients(all)
  }

  const clearDrafts = () => setSelectedDraftRecipients(new Set())

  const sendEmail = async () => {
    const recipients = Array.from(selected)
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      alert('Please enter subject, body, and select at least one recipient')
      return
    }
    
    try {
      setSending(true)
      const res = await salesAPI.bulkSend({ subject, body, recipients })
      alert(`Email sent to ${res.data.sent.length} recipients successfully!`)
      if (res.data.errors.length > 0) {
        alert(`Failed to send to ${res.data.errors.length} recipients`)
      }
      setSubject('')
      setBody('')
      setSelected(new Set())
    } catch (error) {
      console.error('Failed to send email', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const sendDraftFollowUps = async () => {
    const recipients = Array.from(selectedDraftRecipients)
    if (!followUpSubject.trim() || !followUpBody.trim() || recipients.length === 0) {
      alert('Please enter follow-up subject, body, and select at least one draft application')
      return
    }

    try {
      setSending(true)
      const res = await salesAPI.bulkSend({ subject: followUpSubject, body: followUpBody, recipients })
      alert(`Follow-up email sent to ${res.data.sent.length} draft applicants successfully!`)
      setFollowUpSubject('')
      setFollowUpBody('')
      setSelectedDraftRecipients(new Set())
    } catch (error) {
      console.error('Failed to send draft follow-up email', error)
      alert('Failed to send follow-up email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleStageChange = async (leadId, newStage) => {
    try {
      await salesAPI.updateLead(leadId, { stage: newStage })
      loadLeads()
    } catch (error) {
      console.error('Failed to update lead stage', error)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'leads', label: 'All Leads', icon: Users },
    { id: 'generic', label: 'Generic Leads', icon: Mail },
    { id: 'applications', label: 'Draft Applications', icon: Calendar },
    { id: 'email', label: 'Email Campaign', icon: Send },
  ]

  const pipelineStages = ['new', 'contacted', 'qualified', 'in_process', 'approved', 'completed']
  const leadSources = ['generic', 'application', 'signup', 'manual', 'approved_application']

  if (loading && activeTab === 'overview') {
    return <Loading />
  }

  if (user && !canAccessSales) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sales Dashboard</h1>
          <p className="text-gray-600">Manage leads, track pipeline, and communicate with prospects</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setStageFilter('all')
                setSourceFilter('all')
                setSearchQuery('')
                setDraftSearch('')
                setSelectedDraftRecipients(new Set())
              }}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
                  </div>
                  <Users className="text-blue-500" size={32} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Leads</p>
                    <p className="text-3xl font-bold text-green-600">{stats.activeLeads || 0}</p>
                  </div>
                  <TrendingUp className="text-green-500" size={32} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.completedLeads || 0}</p>
                  </div>
                  <CheckCircle className="text-purple-500" size={32} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div>
                  <p className="text-gray-600 text-sm mb-3">By Stage</p>
                  <div className="space-y-2">
                    {Object.entries(stats.byStage || {}).slice(0, 3).map(([stage, count]) => (
                      <div key={stage} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">{stage}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Pipeline Snapshot</h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {Object.entries(stats.byStage || {}).length === 0 ? (
                      <p className="text-sm text-gray-500">No stage data yet.</p>
                    ) : (
                      Object.entries(stats.byStage || {}).map(([stage, count]) => {
                        const total = Math.max(stats.total || 1, 1)
                        const width = Math.max(Math.round((count / total) * 100), 8)
                        return (
                          <div key={stage}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 capitalize">{stage.replace(/_/g, ' ')}</span>
                              <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Lead Sources</h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {Object.entries(stats.bySources || {}).length === 0 ? (
                      <p className="text-sm text-gray-500">No source data yet.</p>
                    ) : (
                      Object.entries(stats.bySources || {}).map(([source, count]) => {
                        const total = Math.max(stats.total || 1, 1)
                        const width = Math.max(Math.round((count / total) * 100), 8)
                        return (
                          <div key={source}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 capitalize">{source.replace(/_/g, ' ')}</span>
                              <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-2 rounded-full bg-green-600" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* All Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      const filtered = leads.filter(lead =>
                        lead.email?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                        lead.full_name?.toLowerCase().includes(e.target.value.toLowerCase())
                      )
                      setFilteredLeads(filtered)
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Stages</option>
                    {pipelineStages.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Sources</option>
                    {leadSources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Leads Table */}
            <Card>
              <CardBody>
                {loading ? (
                  <Loading />
                ) : filteredLeads.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No leads found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Stage</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Source</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{lead.email}</td>
                            <td className="px-4 py-3 text-gray-900">{lead.full_name || '-'}</td>
                            <td className="px-4 py-3">
                              <select
                                value={lead.stage || 'new'}
                                onChange={(e) => handleStageChange(lead.id, e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                {pipelineStages.map(stage => (
                                  <option key={stage} value={stage}>{stage}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <Badge color={lead.source === 'generic' ? 'blue' : 'green'}>
                                {lead.source}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge color={lead.status === 'active' ? 'green' : 'gray'}>
                                {lead.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => loadLeadDetails(lead.id)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
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
          </div>
        )}

        {/* Generic Leads Tab */}
        {activeTab === 'generic' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-3">This view includes simple users and signup leads with name, email, and phone.</p>
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  const filtered = leads.filter(lead =>
                    lead.email?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    lead.full_name?.toLowerCase().includes(e.target.value.toLowerCase())
                  )
                  setFilteredLeads(filtered)
                }}
              />
            </div>

            {/* Generic Leads Table */}
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-4">These are users who registered in the system (generic leads)</p>
                {loading ? (
                  <Loading />
                ) : filteredLeads.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No generic leads found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Phone</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{lead.email}</td>
                            <td className="px-4 py-3 text-gray-900">{lead.full_name || '-'}</td>
                            <td className="px-4 py-3 text-gray-900">{lead.phone || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => loadLeadDetails(lead.id)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
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
          </div>
        )}

        {/* Draft Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Draft Applications</h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600 mb-4">
                  Draft applications older than a day are shown here so you can send completion reminders.
                </p>
                <Input
                  placeholder="Search by email, name, country, or visa type..."
                  value={draftSearch}
                  onChange={(e) => {
                    setDraftSearch(e.target.value)
                    const filtered = draftApplications.filter(app =>
                      app.user_email?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      app.user_name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      app.country?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      app.visa_type?.toLowerCase().includes(e.target.value.toLowerCase())
                    )
                    setFilteredDraftApplications(filtered)
                  }}
                />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="mb-4 flex gap-2 flex-wrap">
                  <Button onClick={selectAllDrafts} variant="outline">Select All</Button>
                  <Button onClick={clearDrafts} variant="outline">Clear All</Button>
                  <Button 
                    onClick={sendDraftFollowUps} 
                    disabled={sending || selectedDraftRecipients.size === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {sending ? 'Sending...' : `Send follow-up to ${selectedDraftRecipients.size} draft applicant${selectedDraftRecipients.size !== 1 ? 's' : ''}`}
                  </Button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedDraftRecipients.size === filteredDraftApplications.length && filteredDraftApplications.length > 0}
                            onChange={(e) => e.target.checked ? selectAllDrafts() : clearDrafts()}
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Applicant</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Phone</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Country / Visa</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDraftApplications.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-gray-600">No draft applications found</td>
                        </tr>
                      ) : filteredDraftApplications.map(app => (
                        <tr key={app.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedDraftRecipients.has(app.user_email)}
                              onChange={() => toggleDraftSelect(app.user_email)}
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-900">{app.user_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-900">{app.user_email || '-'}</td>
                          <td className="px-4 py-3 text-gray-900">{app.phone || '-'}</td>
                          <td className="px-4 py-3 text-gray-900">{app.country || '-'} / {app.visa_type || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="warning">Draft</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Draft Follow-up Email</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <Input
                      placeholder="Reminder to complete your draft application"
                      value={followUpSubject}
                      onChange={(e) => setFollowUpSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                    <textarea
                      placeholder="Ask the applicant to finish and submit their draft application..."
                      value={followUpBody}
                      onChange={(e) => setFollowUpBody(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-gray-600">
                      Selected recipients: {selectedDraftRecipients.size}
                    </p>
                    <Button
                      onClick={sendDraftFollowUps}
                      disabled={sending || selectedDraftRecipients.size === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {sending ? 'Sending...' : 'Send Follow-up Email'}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Email Campaign Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {/* Email Composer */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Compose Email Campaign</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <Input
                      placeholder="Email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                    <textarea
                      placeholder="Email message body..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Recipient Selection */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Select Recipients</h2>
              </CardHeader>
              <CardBody>
                <div className="mb-4 flex gap-2">
                  <Button onClick={selectAll} variant="outline">Select All</Button>
                  <Button onClick={clearAll} variant="outline">Clear All</Button>
                  <Button 
                    onClick={sendEmail} 
                    disabled={sending || selected.size === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {sending ? 'Sending...' : `Send to ${selected.size} recipient${selected.size !== 1 ? 's' : ''}`}
                  </Button>
                </div>

                {/* Recipients List */}
                <div className="border rounded-lg">
                  <div className="max-h-96 overflow-y-auto">
                    {leads.length === 0 ? (
                      <div className="p-8 text-center text-gray-600">
                        <Mail size={32} className="mx-auto mb-2 text-gray-400" />
                        <p>No leads available to send email to</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 w-8">
                              <input
                                type="checkbox"
                                checked={selected.size === leads.length && leads.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    selectAll()
                                  } else {
                                    clearAll()
                                  }
                                }}
                              />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={selected.has(lead.email)}
                                  onChange={() => toggleSelect(lead.email)}
                                />
                              </td>
                              <td className="px-4 py-3 text-gray-900">{lead.email}</td>
                              <td className="px-4 py-3 text-gray-900">{lead.full_name || '-'}</td>
                              <td className="px-4 py-3">
                                <Badge color={lead.status === 'active' ? 'green' : 'gray'}>
                                  {lead.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Lead Details Modal */}
        {selectedLead && (
          <Modal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} size="md" title="Lead Details">
            <div className="w-full">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedLead.full_name || selectedLead.email}</h2>
                <p className="text-gray-600 text-sm mt-1">{selectedLead.email}</p>
                {selectedLead.phone && <p className="text-gray-600 text-sm">{selectedLead.phone}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Stage</p>
                  <p className="text-lg font-semibold text-blue-600 capitalize">{selectedLead.stage}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-green-600 capitalize">{selectedLead.status}</p>
                </div>
              </div>

              {/* Communications Timeline */}
              <h3 className="font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Communication History</h3>
              {communications.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto mb-6">
                  {communications.map((comm, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle size={14} className="text-gray-600" />
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
                <p className="text-sm text-gray-500 italic mb-6">No communication history</p>
              )}

              {/* Follow-ups */}
              <h3 className="font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Follow-up Tasks</h3>
              {followUps.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {followUps.map((task, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {task.status === 'completed' ? (
                          <CheckCircle size={14} className="text-green-600" />
                        ) : (
                          <Clock size={14} className="text-orange-600" />
                        )}
                        <span className="font-medium text-gray-900">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No scheduled follow-up tasks</p>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
