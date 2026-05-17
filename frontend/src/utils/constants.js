export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const APPLICATION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PROCESSING: 'processing',
  UNDER_REVIEW: 'under_review',
  REVIEWED: 'reviewed',
  FEE_UNPAID: 'fee_unpaid',
  FEE_VERIFICATION: 'fee_verification',
  FEE_VERIFIED: 'fee_verified',
  FEE_VERIFICATION_FAILED: 'fee_verification_failed',
  FINAL_APPROVED: 'final_approved',
  FINAL_REJECTED: 'final_rejected',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  processing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  under_review: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  reviewed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  fee_unpaid: 'bg-orange-100 text-orange-800 border-orange-300',
  fee_verification: 'bg-purple-100 text-purple-800 border-purple-300',
  fee_verified: 'bg-green-100 text-green-800 border-green-300',
  fee_verification_failed: 'bg-red-100 text-red-800 border-red-300',
  final_approved: 'bg-green-100 text-green-800 border-green-300',
  final_rejected: 'bg-red-100 text-red-800 border-red-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

export const getApplicationProgress = (status = '') => {
  const progressMap = {
    draft: 0,
    submitted: 0,
    processing: 20,
    under_review: 40,
    reviewed: 60,
    fee_unpaid: 70,
    fee_verification: 80,
    fee_verified: 85,
    fee_verification_failed: 70,
    final_approved: 100,
    final_rejected: 100,
    approved: 100,
    rejected: 100,
    cancelled: 0,
  };

  return progressMap[status] ?? 0;
};

export const getVisaPurposeForType = (visaType = '') => {
  const normalizedVisaType = visaType.toLowerCase();

  if (normalizedVisaType.includes('student') || normalizedVisaType.includes('study')) {
    return 'Education';
  }

  if (normalizedVisaType.includes('work')) {
    return 'Work';
  }

  if (normalizedVisaType.includes('business')) {
    return 'Business';
  }

  if (normalizedVisaType.includes('family')) {
    return 'Family Visit';
  }

  if (normalizedVisaType.includes('medical')) {
    return 'Medical';
  }

  if (normalizedVisaType.includes('transit')) {
    return 'Transit';
  }

  if (normalizedVisaType.includes('tourist') || normalizedVisaType.includes('tourism') || normalizedVisaType.includes('visit')) {
    return 'Tourism';
  }

  return '';
};

export const VISA_TYPES = {
  TOURIST: 'Tourist Visa',
  STUDENT: 'Student Visa',
  WORK: 'Work Visa',
  BUSINESS: 'Business Visa',
  FAMILY: 'Family Visa',
  TRANSIT: 'Transit Visa',
};

export const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', popular: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', popular: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', popular: true },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', popular: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', popular: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', popular: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', popular: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', popular: false },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', popular: true },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', popular: false },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', popular: false },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', popular: false },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', popular: false },
];
