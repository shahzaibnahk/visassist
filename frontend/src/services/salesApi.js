import api from './api'

export const salesAPI = {
  // Lead management
  getLeads: (stage = null, source = null) => {
    let url = '/sales/leads'
    const params = new URLSearchParams()
    if (stage) params.append('stage', stage)
    if (source) params.append('source', source)
    if (params.toString()) url += '?' + params.toString()
    return api.get(url)
  },
  
  getGenericLeads: () => api.get('/sales/leads/generic'),
  getDraftApplications: () => api.get('/sales/applications/drafts'),
  getLeadsByStage: (stage) => api.get(`/sales/leads/by-stage/${stage}`),
  getLeadDetails: (leadId) => api.get(`/sales/leads/${leadId}`),
  
  createLead: (data) => api.post('/sales/leads', data),
  updateLead: (leadId, data) => api.put(`/sales/leads/${leadId}`, data),
  
  // Communications
  getLeadCommunications: (leadId) => api.get(`/sales/leads/${leadId}/communications`),
  addCommunication: (leadId, data) => api.post(`/sales/leads/${leadId}/communications`, data),
  
  // Follow-ups
  getLeadFollowUps: (leadId) => api.get(`/sales/leads/${leadId}/follow-ups`),
  addFollowUp: (leadId, data) => api.post(`/sales/leads/${leadId}/follow-ups`, data),
  updateFollowUp: (leadId, taskId, status, notes = null) => 
    api.put(`/sales/leads/${leadId}/follow-ups/${taskId}`, { status, notes }),
  
  // Email campaigns
  bulkSend: (payload) => api.post('/sales/send', payload),
}
