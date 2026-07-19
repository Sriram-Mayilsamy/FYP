import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
};

export const setToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export const setUser = (user) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const adminLogin = (email, password) =>
  api.post('/auth/admin-login', { email, password });

export const doctorLogin = (email, password) =>
  api.post('/auth/doctor-login', { email, password });

export const patientLogin = (email, password) =>
  api.post('/auth/patient-login', { email, password });

export const adminSearchByEcard = (ecardNumber) =>
  api.get(`/auth/admin/ecard/${ecardNumber}`);

// Doctor APIs
export const submitDoctorRegistration = (data) =>
  api.post('/doctors/register-request', data);

export const getPendingDoctorRequests = () =>
  api.get('/doctors/pending-requests');

export const getAllDoctors = () =>
  api.get('/doctors');

export const approveDoctorRequest = (doctorId) =>
  api.post(`/doctors/approve/${doctorId}`);

export const rejectDoctorRequest = (doctorId) =>
  api.post(`/doctors/reject/${doctorId}`);

export const getApprovedDoctors = () =>
  api.get('/doctors/approved-list');

// Patient APIs
export const patientSelfRegister = (data) =>
  api.post('/patients/self-register', data);

export const doctorCreatePatient = (data) =>
  api.post('/patients/create-by-doctor', data);

export const getPatientProfile = () =>
  api.get('/patients/profile');

export const updatePatientPrivacy = (profile_visibility) =>
  api.patch('/patients/privacy', { profile_visibility });

export const getPatientAccessRequests = () =>
  api.get('/patients/access-requests');

export const approveAccessRequest = (requestId) =>
  api.post(`/patients/access-requests/${requestId}/approve`);

export const rejectAccessRequest = (requestId) =>
  api.post(`/patients/access-requests/${requestId}/reject`);

export const terminateAccessRequest = (requestId) =>
  api.post(`/patients/access-requests/${requestId}/terminate`);

export const getAllPatientsForAdmin = () =>
  api.get('/patients/admin');

export const getMyCreatedPatients = () =>
  api.get('/patients/doctor/mine');

export const findPatientByEcard = (ecardNumber) =>
  api.get(`/patients/ecard/${ecardNumber}`);

export const requestPatientAccess = (patientId, data) =>
  api.post(`/patients/${patientId}/access-requests`, data);

export const createMedicalVisit = (patientId, data) =>
  api.post(`/patients/${patientId}/visits`, data);

export const getVisitDetails = (visitId) =>
  api.get(`/patients/visits/${visitId}`);

export const importMedicalReport = (file) => {
  const formData = new FormData();
  formData.append('report', file);
  return api.post('/ai/import-medical-report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getPatientDetails = (patientUserId) =>
  api.get(`/patients/admin/patient/${patientUserId}`);
