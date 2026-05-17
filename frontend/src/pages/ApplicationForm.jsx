import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, Send, ArrowLeft, ArrowRight, CheckCircle, Upload, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import SubmissionModal from '../components/modals/SubmissionModal';
import api from '../services/api';
import { countryAPI, profileAPI } from '../services/api';
import { COUNTRIES, getApplicationProgress, getVisaPurposeForType, VISA_TYPES } from '../utils/constants';

const STEPS = [
  { id: 1, title: 'Personal Information', icon: '👤' },
  { id: 2, title: 'Contact Details', icon: '📞' },
  { id: 3, title: 'Travel Information', icon: '✈️' },
  { id: 4, title: 'Employment Details', icon: '💼' },
  { id: 5, title: 'Review & Submit', icon: '✅' },
];

export default function ApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { country, countryCode, visaType } = location.state || {};

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [availableCountries, setAvailableCountries] = useState(COUNTRIES);
  const [profileData, setProfileData] = useState(null);
  const [modalState, setModalState] = useState(null); // null, 'loading', 'success', 'error'
  const [modalError, setModalError] = useState(null);
  const [carryForward, setCarryForward] = useState({
    personal_info: true,
    contact_info: true,
    education_history: true,
    employment_history: true,
  });

  const [formData, setFormData] = useState({
    country: country || '',
    country_code: countryCode || '',
    visa_type: visaType || '',
    personal_info: {
      first_name: '',
      middle_name: '',
      last_name: '',
      date_of_birth: '',
      nationality: '',
      passport_number: '',
      passport_expiry: '',
      gender: '',
      marital_status: '',
    },
    contact_info: {
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
    travel_info: {
      purpose_of_visit: getVisaPurposeForType(visaType || ''),
      intended_arrival_date: '',
      intended_departure_date: '',
      duration_of_stay: '',
      accommodation_details: '',
      travel_history: [],
    },
    employment_info: {
      occupation: '',
      employer_name: '',
      employer_address: '',
      institution_name: '',
      institution_address: '',
      monthly_income: '',
      employment_status: '',
    },
    education_history: [],
    employment_history: [],
    documents: [],
    notes: '',
  });

  useEffect(() => {
    if (!country) {
      navigate('/countries');
    }
  }, [country, navigate]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await countryAPI.getAll();
        setAvailableCountries(res.data?.countries || COUNTRIES);
      } catch (err) {
        console.error('Failed to load countries list', err);
        setAvailableCountries(COUNTRIES);
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const localProfile = user?.profile || null;
        if (localProfile) {
          setProfileData(localProfile);
          return;
        }

        const res = await profileAPI.getMyProfile();
        setProfileData(res.data || null);
      } catch (err) {
        console.error('Failed to load profile for application prefill', err);
        setProfileData(null);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    const status = formData.employment_info.employment_status;
    if (!status) {
      return;
    }

    setFormData((prev) => {
      const nextEmploymentInfo = { ...prev.employment_info };
      let changed = false;

      if (status === 'Unemployed') {
        ['occupation', 'employer_name', 'employer_address', 'institution_name', 'institution_address', 'monthly_income'].forEach((field) => {
          if (nextEmploymentInfo[field]) {
            nextEmploymentInfo[field] = '';
            changed = true;
          }
        });
      } else if (status === 'Student') {
        ['employer_name', 'employer_address'].forEach((field) => {
          if (nextEmploymentInfo[field]) {
            nextEmploymentInfo[field] = '';
            changed = true;
          }
        });
      } else {
        ['institution_name', 'institution_address'].forEach((field) => {
          if (nextEmploymentInfo[field]) {
            nextEmploymentInfo[field] = '';
            changed = true;
          }
        });
      }

      return changed ? { ...prev, employment_info: nextEmploymentInfo } : prev;
    });
  }, [formData.employment_info.employment_status]);

  useEffect(() => {
    if (!profileData) {
      return;
    }

    const personalInfo = profileData.personal_info || {};
    const educationHistory = profileData.education_history || [];
    const employmentHistory = profileData.employment_history || [];

    setFormData((prev) => ({
      ...prev,
      personal_info: carryForward.personal_info ? {
        ...prev.personal_info,
        first_name: personalInfo.first_name || prev.personal_info.first_name,
        middle_name: personalInfo.middle_name || prev.personal_info.middle_name,
        last_name: personalInfo.last_name || prev.personal_info.last_name,
        date_of_birth: personalInfo.date_of_birth || prev.personal_info.date_of_birth,
        passport_number: personalInfo.passport_number || prev.personal_info.passport_number,
        gender: personalInfo.gender || prev.personal_info.gender,
        marital_status: personalInfo.marital_status || prev.personal_info.marital_status,
      } : prev.personal_info,
      contact_info: carryForward.contact_info ? {
        ...prev.contact_info,
        email: personalInfo.email || user?.email || prev.contact_info.email,
        phone: personalInfo.phone || prev.contact_info.phone,
        address: personalInfo.address || prev.contact_info.address,
        city: personalInfo.city || prev.contact_info.city,
        state: personalInfo.state || prev.contact_info.state,
        postal_code: personalInfo.postal_code || prev.contact_info.postal_code,
        country: personalInfo.country || prev.contact_info.country,
      } : prev.contact_info,
      employment_info: carryForward.employment_history && employmentHistory.length > 0 ? {
        ...prev.employment_info,
        occupation: employmentHistory[0].job_title || prev.employment_info.occupation,
        employer_name: employmentHistory[0].company_name || prev.employment_info.employer_name,
        employer_address: employmentHistory[0].location || prev.employment_info.employer_address,
        employment_status: employmentHistory[0].currently_working ? 'Employed' : prev.employment_info.employment_status,
      } : prev.employment_info,
      education_history: carryForward.education_history ? educationHistory : prev.education_history,
      employment_history: carryForward.employment_history ? employmentHistory : prev.employment_history,
    }));
  }, [profileData, carryForward, user]);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handlePurposeOfVisitChange = (purposeValue) => {
    // Update both purpose_of_visit and visa_type to keep them synchronized
    setFormData((prev) => ({
      ...prev,
      visa_type: purposeValue,
      travel_info: {
        ...prev.travel_info,
        purpose_of_visit: purposeValue,
      },
    }));
  };

  const mapEmploymentToCurrent = (history = []) => {
    if (!history.length) {
      return null;
    }

    const latest = history[0];
    return {
      occupation: latest.job_title || '',
      employer_name: latest.company_name || '',
      employer_address: latest.location || '',
      monthly_income: '',
      employment_status: latest.currently_working ? 'Employed' : 'Previously Employed',
    };
  };

  const applyProfileSelections = (nextSelections) => {
    if (!profileData) {
      return;
    }

    const personalInfo = profileData.personal_info || {};
    const educationHistory = profileData.education_history || [];
    const employmentHistory = profileData.employment_history || [];

    setFormData((prev) => ({
      ...prev,
      personal_info: nextSelections.personal_info ? {
        ...prev.personal_info,
        first_name: personalInfo.first_name || '',
        middle_name: personalInfo.middle_name || '',
        last_name: personalInfo.last_name || '',
        date_of_birth: personalInfo.date_of_birth || '',
        passport_number: personalInfo.passport_number || '',
        gender: personalInfo.gender || '',
        marital_status: personalInfo.marital_status || '',
      } : {
        ...prev.personal_info,
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        passport_number: '',
        gender: '',
        marital_status: '',
      },
      contact_info: nextSelections.contact_info ? {
        ...prev.contact_info,
        email: personalInfo.email || user?.email || '',
        phone: personalInfo.phone || '',
        address: personalInfo.address || '',
        city: personalInfo.city || '',
        state: personalInfo.state || '',
        postal_code: personalInfo.postal_code || '',
        country: personalInfo.country || prev.contact_info.country,
      } : {
        ...prev.contact_info,
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      },
      education_history: nextSelections.education_history ? educationHistory : [],
      employment_history: nextSelections.employment_history ? employmentHistory : [],
      employment_info: nextSelections.employment_history && mapEmploymentToCurrent(employmentHistory) ? {
        ...prev.employment_info,
        ...mapEmploymentToCurrent(employmentHistory),
      } : {
        ...prev.employment_info,
        occupation: '',
        employer_name: '',
        employer_address: '',
        monthly_income: '',
        employment_status: '',
      },
    }));
  };

  const toggleCarryForward = (field) => {
    setCarryForward((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      applyProfileSelections(next);
      return next;
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type,
      file: file,
      uploaded: false
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPendingFiles = async (appId) => {
    const pendingFiles = uploadedFiles.filter(f => !f.uploaded);
    
    for (const fileObj of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append('file', fileObj.file);
        
        await api.post(`/applications/${appId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        setUploadedFiles(prev => prev.map(f => 
          f === fileObj ? { ...f, uploaded: true } : f
        ));
      } catch (err) {
        console.error('Failed to upload file:', fileObj.name, err);
      }
    }
  };

  const saveAsDraft = async () => {
    try {
      setLoading(true);
      let appId = applicationId;
      const payload = {
        ...formData,
        documents: uploadedFiles.map((f) => f.name),
      };
      const response = appId
        ? await api.put(`/applications/${appId}`, payload)
        : await api.post('/applications', payload);

      if (!appId) {
        appId = response.data.id;
        setApplicationId(appId);
      }

      await uploadPendingFiles(appId);

      alert('Application saved as draft successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitApplication = async () => {
    // Validate all steps first
    const validationError = validateAllSteps();
    if (validationError) {
      setCurrentStep(1);
      alert('Please fix the following error before submitting: ' + validationError);
      return;
    }

    // Show loading modal
    setModalState('loading');
    setModalError(null);

    try {
      let submissionData = {
        ...formData,
        documents: uploadedFiles.map((f) => f.name),
      };

      // Create application
      const createRes = await api.post('/applications', submissionData);
      const appId = createRes.data.id;

      // Upload pending files
      await uploadPendingFiles(appId);

      // Update status to submitted
      await api.put(`/applications/${appId}`, { ...submissionData, status: 'submitted' });

      // Show success
      setModalState('success');
    } catch (error) {
      console.error('Error submitting application:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit application. Please try again.';
      setModalState('error');
      setModalError(errorMessage);
    }
  };

  const handleSubmissionModalClose = () => {
    setModalState(null);
    setModalError(null);
  };

  const handleSubmissionSuccess = () => {
    navigate('/applications');
  };

  const nextStep = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      alert(validationError);
      return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Personal Info
        if (!formData.personal_info.first_name) return 'First name is required';
        if (!formData.personal_info.last_name) return 'Last name is required';
        if (!formData.personal_info.date_of_birth) return 'Date of birth is required';
        if (!formData.personal_info.nationality) return 'Nationality is required';
        if (!formData.personal_info.passport_number) return 'Passport number is required';
        if (!formData.personal_info.passport_expiry) return 'Passport expiry date is required';
        if (!formData.personal_info.gender) return 'Gender is required';
        if (!formData.personal_info.marital_status) return 'Marital status is required';
        return null;
      
      case 2: // Contact Info
        if (!formData.contact_info.email) return 'Email is required';
        if (!formData.contact_info.phone) return 'Phone number is required';
        if (!formData.contact_info.address) return 'Address is required';
        if (!formData.contact_info.city) return 'City is required';
        if (!formData.contact_info.postal_code) return 'Postal code is required';
        if (!formData.contact_info.country) return 'Country is required';
        return null;
      
      case 3: // Travel Info
        if (!formData.travel_info.purpose_of_visit) return 'Purpose of visit is required';
        if (!formData.travel_info.intended_arrival_date) return 'Intended arrival date is required';
        if (!formData.travel_info.duration_of_stay) return 'Duration of stay is required';
        return null;
      
      case 4: // Employment Info
        if (!formData.employment_info.employment_status) return 'Employment status is required';
        if (formData.employment_info.employment_status === 'Employed' || formData.employment_info.employment_status === 'Self-Employed') {
          if (!formData.employment_info.occupation) return 'Occupation is required';
          if (!formData.employment_info.employer_name) return 'Employer name is required';
        }
        if (formData.employment_info.employment_status === 'Student') {
          if (!formData.employment_info.occupation) return 'Course/Program is required';
          if (!formData.employment_info.institution_name) return 'Institution name is required';
        }
        return null;
      
      case 5: // Review - no specific validation needed
        return null;
      
      default:
        return null;
    }
  };

  const validateAllSteps = () => {
    for (let step = 1; step <= 4; step++) {
      setCurrentStep(step);
      const error = validateCurrentStep();
      if (error) {
        return error;
      }
    }
    return null;
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name *"
          value={formData.personal_info.first_name}
          onChange={(e) => handleInputChange('personal_info', 'first_name', e.target.value)}
          required
        />
        <Input
          label="Middle Name"
          value={formData.personal_info.middle_name}
          onChange={(e) => handleInputChange('personal_info', 'middle_name', e.target.value)}
        />
      </div>
      <Input
        label="Last Name *"
        value={formData.personal_info.last_name}
        onChange={(e) => handleInputChange('personal_info', 'last_name', e.target.value)}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="date"
          label="Date of Birth *"
          value={formData.personal_info.date_of_birth}
          onChange={(e) => handleInputChange('personal_info', 'date_of_birth', e.target.value)}
          required
        />
        <Input
          label="Nationality *"
          value={formData.personal_info.nationality}
          onChange={(e) => handleInputChange('personal_info', 'nationality', e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Passport Number *"
          value={formData.personal_info.passport_number}
          onChange={(e) => handleInputChange('personal_info', 'passport_number', e.target.value)}
          required
        />
        <Input
          type="date"
          label="Passport Expiry *"
          value={formData.personal_info.passport_expiry}
          onChange={(e) => handleInputChange('personal_info', 'passport_expiry', e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.personal_info.gender}
            onChange={(e) => handleInputChange('personal_info', 'gender', e.target.value)}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status *</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.personal_info.marital_status}
            onChange={(e) => handleInputChange('personal_info', 'marital_status', e.target.value)}
            required
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderContactInfo = () => (
    <div className="space-y-4">
      <Input
        type="email"
        label="Email *"
        value={formData.contact_info.email}
        onChange={(e) => handleInputChange('contact_info', 'email', e.target.value)}
        required
      />
      <Input
        label="Phone Number *"
        value={formData.contact_info.phone}
        onChange={(e) => handleInputChange('contact_info', 'phone', e.target.value)}
        placeholder="+1234567890"
        required
      />
      <Input
        label="Address *"
        value={formData.contact_info.address}
        onChange={(e) => handleInputChange('contact_info', 'address', e.target.value)}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="City *"
          value={formData.contact_info.city}
          onChange={(e) => handleInputChange('contact_info', 'city', e.target.value)}
          required
        />
        <Input
          label="State/Province"
          value={formData.contact_info.state}
          onChange={(e) => handleInputChange('contact_info', 'state', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Postal Code *"
          value={formData.contact_info.postal_code}
          onChange={(e) => handleInputChange('contact_info', 'postal_code', e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.contact_info.country}
            onChange={(e) => handleInputChange('contact_info', 'country', e.target.value)}
            required
          >
            <option value="">Select Country</option>
            {availableCountries.map((c) => (
              <option key={c.code} value={c.name}>
                {(c.flag || '')} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderTravelInfo = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Purpose of Visit *</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={formData.travel_info.purpose_of_visit}
          onChange={(e) => handlePurposeOfVisitChange(e.target.value)}
          required
        >
          <option value="">Select Purpose of Visit</option>
          {Object.values(VISA_TYPES).map((purpose) => (
            <option key={purpose} value={purpose}>
              {purpose}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="date"
          label="Intended Arrival Date *"
          value={formData.travel_info.intended_arrival_date}
          onChange={(e) => handleInputChange('travel_info', 'intended_arrival_date', e.target.value)}
          required
        />
        <Input
          type="date"
          label="Intended Departure Date"
          value={formData.travel_info.intended_departure_date}
          onChange={(e) => handleInputChange('travel_info', 'intended_departure_date', e.target.value)}
        />
      </div>
      <Input
        label="Duration of Stay *"
        value={formData.travel_info.duration_of_stay}
        onChange={(e) => handleInputChange('travel_info', 'duration_of_stay', e.target.value)}
        placeholder="e.g., 2 weeks, 3 months"
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Accommodation Details</label>
        <textarea
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
          value={formData.travel_info.accommodation_details}
          onChange={(e) => handleInputChange('travel_info', 'accommodation_details', e.target.value)}
          placeholder="Hotel name, address or host details"
        />
      </div>
    </div>
  );

  const renderEmploymentInfo = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status *</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={formData.employment_info.employment_status}
          onChange={(e) => handleInputChange('employment_info', 'employment_status', e.target.value)}
          required
        >
          <option value="">Select Status</option>
          <option value="Employed">Employed</option>
          <option value="Self-Employed">Self-Employed</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Student">Student</option>
          <option value="Retired">Retired</option>
        </select>
      </div>
      {formData.employment_info.employment_status === 'Unemployed' ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          No employment details are required for unemployed applicants.
        </div>
      ) : formData.employment_info.employment_status === 'Student' ? (
        <>
          <Input
            label="Course / Program *"
            value={formData.employment_info.occupation}
            onChange={(e) => handleInputChange('employment_info', 'occupation', e.target.value)}
            placeholder="e.g., Master of Computer Science"
            required
          />
          <Input
            label="University Name *"
            value={formData.employment_info.institution_name}
            onChange={(e) => handleInputChange('employment_info', 'institution_name', e.target.value)}
            placeholder="University name"
            required
          />
          <Input
            label="University Address"
            value={formData.employment_info.institution_address}
            onChange={(e) => handleInputChange('employment_info', 'institution_address', e.target.value)}
            placeholder="University address"
          />
          <Input
            label="Monthly Support / Stipend"
            value={formData.employment_info.monthly_income}
            onChange={(e) => handleInputChange('employment_info', 'monthly_income', e.target.value)}
            placeholder="e.g., 1200"
          />
        </>
      ) : (
        <>
          <Input
            label="Occupation *"
            value={formData.employment_info.occupation}
            onChange={(e) => handleInputChange('employment_info', 'occupation', e.target.value)}
            required
          />
          <Input
            label="Employer Name"
            value={formData.employment_info.employer_name}
            onChange={(e) => handleInputChange('employment_info', 'employer_name', e.target.value)}
          />
          <Input
            label="Employer Address"
            value={formData.employment_info.employer_address}
            onChange={(e) => handleInputChange('employment_info', 'employer_address', e.target.value)}
          />
          <Input
            label="Monthly Income (USD)"
            value={formData.employment_info.monthly_income}
            onChange={(e) => handleInputChange('employment_info', 'monthly_income', e.target.value)}
            placeholder="e.g., 5000"
          />
        </>
      )}

      {/* Document Upload Section */}
      <div className="border-t pt-6 mt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Supporting Documents</h4>
        <p className="text-sm text-gray-600 mb-2">
          Upload required documents. Upload all documents required for your visa type, for example:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
          <li>Passport copy (ID page)</li>
          <li>Passport-sized photo</li>
          <li>Degree certificates / transcripts</li>
          <li>Work experience letters</li>
          <li>Proof of residence (utility bill, tenancy agreement)</li>
          <li>Bank statements or financial proof</li>
        </ul>
        <p className="text-sm text-gray-500 mb-4">You may upload multiple documents at once. Accepted formats: PDF, JPG, PNG. Max 10MB per file.</p>
        
        <div className="mb-4">
          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto mb-2 text-gray-400" size={32} />
              <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
              <span className="block text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</span>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedFiles.length})</h5>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{file.size}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Application Summary</h3>
        <p className="text-sm text-blue-800">
          Country: <strong>{formData.country}</strong> | Visa Type: <strong>{formData.visa_type}</strong>
        </p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Personal Information</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p><strong>Name:</strong> {formData.personal_info.first_name} {formData.personal_info.middle_name} {formData.personal_info.last_name}</p>
          <p><strong>Date of Birth:</strong> {formData.personal_info.date_of_birth}</p>
          <p><strong>Nationality:</strong> {formData.personal_info.nationality}</p>
          <p><strong>Passport:</strong> {formData.personal_info.passport_number}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Contact Information</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p><strong>Email:</strong> {formData.contact_info.email}</p>
          <p><strong>Phone:</strong> {formData.contact_info.phone}</p>
          <p><strong>Address:</strong> {formData.contact_info.address}, {formData.contact_info.city}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Travel Information</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p><strong>Purpose:</strong> {formData.travel_info.purpose_of_visit || getVisaPurposeForType(formData.visa_type)}</p>
          <p><strong>Arrival Date:</strong> {formData.travel_info.intended_arrival_date}</p>
          <p><strong>Duration:</strong> {formData.travel_info.duration_of_stay}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Employment Information</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p><strong>Status:</strong> {formData.employment_info.employment_status}</p>
          {formData.employment_info.employment_status === 'Student' ? (
            <>
              <p><strong>Course / Program:</strong> {formData.employment_info.occupation}</p>
              <p><strong>University:</strong> {formData.employment_info.institution_name}</p>
            </>
          ) : formData.employment_info.employment_status === 'Unemployed' ? (
            <p><strong>Employment Details:</strong> Not required</p>
          ) : (
            <>
              <p><strong>Occupation:</strong> {formData.employment_info.occupation}</p>
              <p><strong>Employer:</strong> {formData.employment_info.employer_name}</p>
            </>
          )}
          {formData.employment_info.monthly_income ? <p><strong>Monthly Income:</strong> ${formData.employment_info.monthly_income}</p> : null}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Uploaded Documents</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <ul className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="text-blue-600" size={16} />
                  <span>{file.name}</span>
                  <span className="text-gray-500">({file.size})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
        <textarea
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="4"
          value={formData.notes}
          onChange={(e) => handleInputChange(null, 'notes', e.target.value)}
          placeholder="Any additional information you'd like to provide..."
        />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ Please review all information carefully before submitting. Once submitted, you cannot edit the application.
        </p>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderContactInfo();
      case 3:
        return renderTravelInfo();
      case 4:
        return renderEmploymentInfo();
      case 5:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <SubmissionModal 
        isOpen={modalState !== null}
        state={modalState}
        error={modalError}
        onClose={handleSubmissionModalClose}
        onSuccess={handleSubmissionSuccess}
      />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/countries')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Country Selection
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Visa Application Form</h1>
          <p className="text-gray-600 mt-2">
            Complete all sections to submit your visa application for {country}
          </p>
        </div>

        <Card className="mb-8 border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardBody className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Carry forward profile data</h3>
              <p className="text-sm text-gray-600">
                Choose which saved profile sections should be prefilled into this visa application.
              </p>
            </div>

            {profileData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['personal_info', 'Personal information'],
                  ['contact_info', 'Contact information'],
                  ['education_history', 'Education history'],
                  ['employment_history', 'Employment history'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={carryForward[key]}
                      onChange={() => toggleCarryForward(key)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block font-medium text-gray-900">{label}</span>
                      <span className="block text-xs text-gray-500">Use data from your saved profile</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No saved profile found yet. Complete your profile first to enable autofill.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full ${
                    currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle size={24} /> : <span className="text-xl">{step.icon}</span>}
                </div>
                <div className="ml-2 hidden md:block">
                  <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 md:w-24 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{STEPS[currentStep - 1].title}</h2>
          </CardHeader>
          <CardBody>{renderStepContent()}</CardBody>
        </Card>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft size={20} className="mr-2" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={saveAsDraft} disabled={loading}>
              <Save size={20} className="mr-2" />
              Save as Draft
            </Button>
            {currentStep < STEPS.length ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight size={20} className="ml-2" />
              </Button>
            ) : (
              <Button onClick={submitApplication} disabled={loading}>
                <Send size={20} className="mr-2" />
                Submit Application
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
