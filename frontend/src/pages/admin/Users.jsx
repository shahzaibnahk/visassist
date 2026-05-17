import { useState, useEffect } from 'react';
import { Search, Eye, Trash2, Mail, Edit2, Plus, X, EyeOff } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import api from '../../services/api';

const USER_TYPE_LABELS = {
  local_user: 'Local User',
  manager: 'Manager',
  admin: 'Admin',
  sales: 'Sales',
  operation: 'Operation',
  finance: 'Finance'
};

const USER_TYPE_VARIANTS = {
  local_user: 'default',
  manager: 'warning',
  admin: 'danger',
  sales: 'primary',
  operation: 'warning',
  finance: 'success'
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUserType, setFilterUserType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [editFormData, setEditFormData] = useState({});
  const [addFormData, setAddFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    country: '',
    password: '',
    user_type: 'local_user',
    role: 'user',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterUserType) params.append('user_type', filterUserType);
      if (filterStatus) {
        params.append('is_active', filterStatus === 'active' ? 'true' : 'false');
      }
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.users || []);
      setTotalUsers(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action can be undone.')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        setUsers(users.filter(u => u.id !== userId));
        setTotalUsers(totalUsers - 1);
        if (showViewModal) setShowViewModal(false);
        alert('User deleted successfully (soft delete)');
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
      setEditFormData({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        country: user?.country || '',
        password: '',
        user_type: user?.user_type || 'local_user',
        role: user?.role || 'user',
        is_active: user?.is_active !== false
      });
      setShowPasswordMap({});
      setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (editFormData.password) {
      const pwd = editFormData.password;
      if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
        alert('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const response = await api.put(`/admin/users/${selectedUser.id}`, editFormData);
      const updatedUser = response.data.user;
      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSelectedUser(updatedUser);
      setShowEditModal(false);
      alert('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUser = async () => {
    // Password Policy Check
    const pwd = addFormData.password;
    if (!pwd || pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      alert('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/admin/users', addFormData);
      const newUser = response.data.user;
      setUsers([...users, newUser]);
      setTotalUsers(totalUsers + 1);
      setShowAddModal(false);
      setAddFormData({
        email: '',
        full_name: '',
        phone: '',
        country: '',
        password: '',
        user_type: 'local_user',
        role: 'user',
        is_active: true
      });
      alert('User created successfully');
    } catch (error) {
      console.error('Failed to create user:', error);
      alert(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    // Debounce the fetch
    setTimeout(() => {
      if (value || value === '') {
        fetchUsers();
      }
    }, 300);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUserType = !filterUserType || user.user_type === filterUserType;
    const matchesStatus = !filterStatus || (filterStatus === 'active' ? user.is_active : !user.is_active);
    return matchesSearch && matchesUserType && matchesStatus;
  });

  const getStatusBadge = (isActive) => {
    return isActive ? 
      <Badge variant="success">Active</Badge> : 
      <Badge variant="default">Inactive</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter */}
      <Card className="mb-8">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                icon={Search}
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterUserType}
                onChange={(e) => {
                  setFilterUserType(e.target.value);
                  fetchUsers();
                }}
              >
                <option value="">All User Types</option>
                <option value="local_user">Local User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="sales">Sales</option>
                <option value="operation">Operation</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  fetchUsers();
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <CardBody>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">{totalUsers}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600 mb-1">Active Users</p>
            <p className="text-3xl font-bold text-green-600">
              {users.filter(u => u.is_active).length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600 mb-1">Local Users</p>
            <p className="text-3xl font-bold text-purple-600">
              {users.filter(u => u.user_type === 'local_user').length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600 mb-1">Managers & Admins</p>
            <p className="text-3xl font-bold text-orange-600">
              {users.filter(u => ['manager', 'admin'].includes(u.user_type)).length}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
              <Badge variant="primary">{filteredUsers.length} users</Badge>
            </div>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => {
                setShowPasswordMap({});
                setShowAddModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={USER_TYPE_VARIANTS[user.user_type] || 'default'}>
                        {USER_TYPE_LABELS[user.user_type] || user.user_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 flex gap-1 flex-wrap">
                      <Badge variant={user.role === 'admin' ? 'danger' : 'default'} className="lowercase">
                        {user.role || 'user'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.is_active)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-semibold text-gray-900">User Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedUser.full_name}</h3>
                  <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      {selectedUser.email}
                    </div>
                    <Badge variant={USER_TYPE_VARIANTS[selectedUser.user_type] || 'default'}>
                      {USER_TYPE_LABELS[selectedUser.user_type]}
                    </Badge>
                    {getStatusBadge(selectedUser.is_active)}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Account Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Full Name</p>
                      <p className="font-medium">{selectedUser.full_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Country</p>
                      <p className="font-medium">{selectedUser.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">User Type</p>
                      <p className="font-medium">{USER_TYPE_LABELS[selectedUser.user_type]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Roles</p>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs uppercase font-medium">
                          {selectedUser.role || 'user'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">Created Date</p>
                      <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Login</p>
                      <p className="font-medium">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setShowViewModal(false)} className="flex-1">
                    Close
                  </Button>
                  <Button variant="primary" onClick={() => {
                    setShowViewModal(false);
                    handleEditUser(selectedUser);
                  }} className="flex-1">
                    Edit User
                  </Button>
                  <Button variant="danger" onClick={() => {
                    handleDeleteUser(selectedUser.id);
                  }} className="flex-1">
                    Delete User
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-semibold text-gray-900">Edit User</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editFormData.full_name}
                      onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={(e) => setEditFormData({...editFormData, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                    <div className="relative">
                      <input
                        type={showPasswordMap.edit ? "text" : "password"}
                        value={editFormData.password || ''}
                        onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                        disabled={submitting}
                        placeholder="Leave blank to keep current"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordMap({...showPasswordMap, edit: !showPasswordMap.edit})}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswordMap.edit ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                    <select
                      value={editFormData.user_type}
                      onChange={(e) => setEditFormData({...editFormData, user_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="local_user">Local User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="operation">Operation</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="operation">Operation</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editFormData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setEditFormData({...editFormData, is_active: e.target.value === 'active'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1" disabled={submitting}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSaveEdit} className="flex-1" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-semibold text-gray-900">Add New User</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={addFormData.full_name}
                      onChange={(e) => setAddFormData({...addFormData, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={addFormData.email}
                      onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={addFormData.phone}
                      onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <input
                      type="text"
                      value={addFormData.country}
                      onChange={(e) => setAddFormData({...addFormData, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="USA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPasswordMap.add ? "text" : "password"}
                        value={addFormData.password}
                        onChange={(e) => setAddFormData({...addFormData, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                        disabled={submitting}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordMap({...showPasswordMap, add: !showPasswordMap.add})}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswordMap.add ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                    <select
                      value={addFormData.user_type}
                      onChange={(e) => setAddFormData({...addFormData, user_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="local_user">Local User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="operation">Operation</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={addFormData.role}
                      onChange={(e) => setAddFormData({...addFormData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="operation">Operation</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1" disabled={submitting}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddUser} className="flex-1" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
