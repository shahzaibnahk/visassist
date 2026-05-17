import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, User, GraduationCap, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { profileAPI } from '../services/api';

const createEmptyPersonalInfo = (email = '', phone = '', country = '') => ({
  first_name: '',
  middle_name: '',
  last_name: '',
  email,
  phone,
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country,
  date_of_birth: '',
  passport_number: '',
  gender: '',
  marital_status: '',
});

const createEmptyEducation = () => ({
  institution_name: '',
  qualification: '',
  field_of_study: '',
  start_date: '',
  end_date: '',
  grade: '',
  country: '',
  description: '',
});

const createEmptyEmployment = () => ({
  company_name: '',
  job_title: '',
  start_date: '',
  end_date: '',
  currently_working: false,
  location: '',
  responsibilities: '',
});

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState(null);
  const [editingEmploymentIndex, setEditingEmploymentIndex] = useState(null);
  const [profile, setProfile] = useState({
    personal_info: createEmptyPersonalInfo(user?.email, user?.phone, user?.country),
    education_history: [],
    employment_history: [],
  });

  useEffect(() => {
    const sourceProfile = user?.profile || {};
    const personalInfo = sourceProfile.personal_info || {};
    setProfile({
      personal_info: {
        ...createEmptyPersonalInfo(user?.email, user?.phone, user?.country),
        ...personalInfo,
      },
      education_history: sourceProfile.education_history || [],
      employment_history: sourceProfile.employment_history || [],
    });
  }, [user]);

  const updatePersonalInfo = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        [field]: value,
      },
    }));
  };

  const updateEducation = (index, field, value) => {
    setProfile((prev) => ({
      ...prev,
      education_history: prev.education_history.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const updateEmployment = (index, field, value) => {
    setProfile((prev) => ({
      ...prev,
      employment_history: prev.employment_history.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const addEducation = () => {
    setProfile((prev) => {
      const nextIndex = prev.education_history.length;
      setEditingEducationIndex(nextIndex);
      return {
        ...prev,
        education_history: [...prev.education_history, createEmptyEducation()],
      };
    });
  };

  const removeEducation = (index) => {
    setProfile((prev) => ({
      ...prev,
      education_history: prev.education_history.filter((_, itemIndex) => itemIndex !== index),
    }));
    setEditingEducationIndex((current) => {
      if (current === index) {
        return null;
      }
      if (current !== null && current > index) {
        return current - 1;
      }
      return current;
    });
  };

  const addEmployment = () => {
    setProfile((prev) => {
      const nextIndex = prev.employment_history.length;
      setEditingEmploymentIndex(nextIndex);
      return {
        ...prev,
        employment_history: [...prev.employment_history, createEmptyEmployment()],
      };
    });
  };

  const removeEmployment = (index) => {
    setProfile((prev) => ({
      ...prev,
      employment_history: prev.employment_history.filter((_, itemIndex) => itemIndex !== index),
    }));
    setEditingEmploymentIndex((current) => {
      if (current === index) {
        return null;
      }
      if (current !== null && current > index) {
        return current - 1;
      }
      return current;
    });
  };

  const closeEducationEditor = () => {
    setEditingEducationIndex(null);
  };

  const closeEmploymentEditor = () => {
    setEditingEmploymentIndex(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await profileAPI.updateMyProfile(profile);
      await refreshUser();
      alert('Profile saved successfully.');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert(error.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Dashboard
        </button>

        <Card className="border border-blue-100 shadow-xl">
          <CardBody className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-blue-600 font-semibold">Client Profile</p>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">Complete your profile</h1>
                <p className="text-gray-600 mt-2 max-w-2xl">
                  Keep your personal details, education history, and work experience in one place so they can be reused in future visa applications.
                </p>
              </div>
              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Profile completion</p>
                <p className="text-3xl font-bold text-gray-900">{user?.profile_completion ?? 0}%</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="text-blue-600" size={20} />
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="First Name" value={profile.personal_info.first_name} onChange={(e) => updatePersonalInfo('first_name', e.target.value)} />
              <Input label="Middle Name" value={profile.personal_info.middle_name} onChange={(e) => updatePersonalInfo('middle_name', e.target.value)} />
              <Input label="Last Name" value={profile.personal_info.last_name} onChange={(e) => updatePersonalInfo('last_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="email" label="Email" value={profile.personal_info.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} />
              <Input label="Phone" value={profile.personal_info.phone} onChange={(e) => updatePersonalInfo('phone', e.target.value)} />
            </div>
            <Input label="Address" value={profile.personal_info.address} onChange={(e) => updatePersonalInfo('address', e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="City" value={profile.personal_info.city} onChange={(e) => updatePersonalInfo('city', e.target.value)} />
              <Input label="State" value={profile.personal_info.state} onChange={(e) => updatePersonalInfo('state', e.target.value)} />
              <Input label="Postal Code" value={profile.personal_info.postal_code} onChange={(e) => updatePersonalInfo('postal_code', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Country" value={profile.personal_info.country} onChange={(e) => updatePersonalInfo('country', e.target.value)} />
              <Input type="date" label="Date of Birth" value={profile.personal_info.date_of_birth} onChange={(e) => updatePersonalInfo('date_of_birth', e.target.value)} />
              <Input label="Passport Number" value={profile.personal_info.passport_number} onChange={(e) => updatePersonalInfo('passport_number', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={profile.personal_info.gender}
                  onChange={(e) => updatePersonalInfo('gender', e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={profile.personal_info.marital_status}
                  onChange={(e) => updatePersonalInfo('marital_status', e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3">
                <GraduationCap className="text-blue-600" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">Education History</h2>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {profile.education_history.length === 0 ? (
              <p className="text-sm text-gray-500">No education records added yet.</p>
            ) : (
              profile.education_history.map((item, index) => (
                <div key={`education-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 bg-white">
                    <div>
                      <h3 className="font-semibold text-gray-900">Education #{index + 1}</h3>
                      <p className="text-sm text-gray-500">{item.institution_name || 'No institution entered yet'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingEducationIndex(index)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeEducation(index)}>
                        <Trash2 size={16} className="mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  {editingEducationIndex === index ? (
                    <div className="space-y-4 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Institution Name" value={item.institution_name} onChange={(e) => updateEducation(index, 'institution_name', e.target.value)} />
                        <Input label="Qualification" value={item.qualification} onChange={(e) => updateEducation(index, 'qualification', e.target.value)} />
                        <Input label="Field of Study" value={item.field_of_study} onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)} />
                        <Input label="Country" value={item.country} onChange={(e) => updateEducation(index, 'country', e.target.value)} />
                        <Input type="date" label="Start Date" value={item.start_date} onChange={(e) => updateEducation(index, 'start_date', e.target.value)} />
                        <Input type="date" label="End Date" value={item.end_date} onChange={(e) => updateEducation(index, 'end_date', e.target.value)} />
                        <Input label="Grade / GPA" value={item.grade} onChange={(e) => updateEducation(index, 'grade', e.target.value)} />
                      </div>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        rows="3"
                        placeholder="Short description or notes"
                        value={item.description}
                        onChange={(e) => updateEducation(index, 'description', e.target.value)}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <Button variant="secondary" onClick={closeEducationEditor}>
                          Done
                        </Button>
                        <Button variant="outline" onClick={addEducation}>
                          <Plus size={16} className="mr-2" />
                          Add Education
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-600 space-y-1">
                      <p>{item.qualification || 'Qualification not set'}{item.field_of_study ? ` • ${item.field_of_study}` : ''}</p>
                      <p>{item.start_date || 'Start date not set'}{item.end_date ? ` - ${item.end_date}` : ''}</p>
                      {item.description ? <p className="text-gray-500">{item.description}</p> : null}
                    </div>
                  )}
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={addEducation}>
              <Plus size={16} className="mr-2" />
              Add Education
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3">
                <Briefcase className="text-blue-600" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">Employment History</h2>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {profile.employment_history.length === 0 ? (
              <p className="text-sm text-gray-500">No employment records added yet.</p>
            ) : (
              profile.employment_history.map((item, index) => (
                <div key={`employment-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 bg-white">
                    <div>
                      <h3 className="font-semibold text-gray-900">Employment #{index + 1}</h3>
                      <p className="text-sm text-gray-500">{item.company_name || 'No company entered yet'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingEmploymentIndex(index)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeEmployment(index)}>
                        <Trash2 size={16} className="mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  {editingEmploymentIndex === index ? (
                    <div className="space-y-4 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Company Name" value={item.company_name} onChange={(e) => updateEmployment(index, 'company_name', e.target.value)} />
                        <Input label="Job Title" value={item.job_title} onChange={(e) => updateEmployment(index, 'job_title', e.target.value)} />
                        <Input label="Location" value={item.location} onChange={(e) => updateEmployment(index, 'location', e.target.value)} />
                        <Input type="date" label="Start Date" value={item.start_date} onChange={(e) => updateEmployment(index, 'start_date', e.target.value)} />
                        <Input type="date" label="End Date" value={item.end_date} onChange={(e) => updateEmployment(index, 'end_date', e.target.value)} />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.currently_working}
                          onChange={(e) => updateEmployment(index, 'currently_working', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Currently working here</span>
                      </div>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        rows="3"
                        placeholder="Responsibilities, achievements, or notes"
                        value={item.responsibilities}
                        onChange={(e) => updateEmployment(index, 'responsibilities', e.target.value)}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <Button variant="secondary" onClick={closeEmploymentEditor}>
                          Done
                        </Button>
                        <Button variant="outline" onClick={addEmployment}>
                          <Plus size={16} className="mr-2" />
                          Add Employment
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-600 space-y-1">
                      <p>{item.job_title || 'Job title not set'}{item.company_name ? ` at ${item.company_name}` : ''}</p>
                      <p>{item.start_date || 'Start date not set'}{item.end_date ? ` - ${item.end_date}` : ''}{item.currently_working ? ' • Currently working' : ''}</p>
                      {item.responsibilities ? <p className="text-gray-500">{item.responsibilities}</p> : null}
                    </div>
                  )}
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={addEmployment}>
              <Plus size={16} className="mr-2" />
              Add Employment
            </Button>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button variant="secondary" onClick={() => navigate('/dashboard')} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={18} className="mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}