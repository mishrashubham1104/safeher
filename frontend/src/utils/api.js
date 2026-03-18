import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('safeher_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('safeher_token');
      localStorage.removeItem('safeher_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const registerUser   = (data) => API.post('/auth/register', data);
export const loginUser      = (data) => API.post('/auth/login', data);
export const getMe          = ()     => API.get('/auth/me');
export const updateProfile  = (data) => API.put('/auth/profile', data);
export const updateLocation = (data) => API.put('/auth/location', data);
export const changePassword = (data) => API.put('/auth/password', data);

// ── Incidents ─────────────────────────────────────────────────
export const getIncidents    = (params) => API.get('/incidents', { params });
export const getMapIncidents = (params) => API.get('/incidents/map', { params });
export const getIncident     = (id)     => API.get(`/incidents/${id}`);
export const createIncident  = (data)   => API.post('/incidents', data);
export const upvoteIncident  = (id)     => API.post(`/incidents/${id}/upvote`);
export const addComment      = (id, data) => API.post(`/incidents/${id}/comment`, data);
export const getMyIncidents  = ()       => API.get('/incidents/my');

// ── SOS ───────────────────────────────────────────────────────
export const triggerSOS         = (data) => API.post('/sos/trigger', data);
export const cancelSOS          = (id, data) => API.put(`/sos/${id}/cancel`, data);
export const updateSOSLocation  = (id, data) => API.put(`/sos/${id}/location`, data);
export const getSOSHistory      = ()     => API.get('/sos/history');
export const getActiveSOS       = ()     => API.get('/sos/active');

// ── Contacts ──────────────────────────────────────────────────
export const getContacts   = ()         => API.get('/contacts');
export const addContact    = (data)     => API.post('/contacts', data);
export const updateContact = (id, data) => API.put(`/contacts/${id}`, data);
export const deleteContact = (id)       => API.delete(`/contacts/${id}`);

// ── Testimonials ──────────────────────────────────────────────
export const getTestimonials        = ()         => API.get('/testimonials');
export const submitTestimonial      = (data)     => API.post('/testimonials', data);
export const getAdminTestimonials   = (params)   => API.get('/testimonials/admin', { params });
export const moderateTestimonial    = (id, data) => API.put(`/testimonials/${id}/moderate`, data);
export const deleteTestimonial      = (id)       => API.delete(`/testimonials/${id}`);
// ── Admin ─────────────────────────────────────────────────────
export const getAdminStats       = ()         => API.get('/admin/stats');
export const getAllUsers         = (params)   => API.get('/admin/users', { params });
export const getAllIncidentsAdmin = (params)  => API.get('/admin/incidents', { params });
export const moderateIncident   = (id, data) => API.put(`/admin/incidents/${id}/moderate`, data);
export const toggleUserStatus   = (id)       => API.put(`/admin/users/${id}/toggle`);
export const getAllSOS           = ()         => API.get('/admin/sos');

export default API;

// ── Volunteers ────────────────────────────────────────────────
export const registerVolunteer       = (data)          => API.post('/volunteers/register', data);
export const getMyVolunteerProfile   = ()              => API.get('/volunteers/me');
export const updateVolunteerLocation = (data)          => API.put('/volunteers/location', data);
export const getNearbyAlerts         = (params)        => API.get('/volunteers/alerts', { params });
export const respondToAlert          = (id, data)      => API.put(`/volunteers/alerts/${id}/respond`, data);
export const updateAlertStatus       = (id, data)      => API.put(`/volunteers/alerts/${id}/status`, data);
export const getActiveAlert          = ()              => API.get('/volunteers/active-alert');
export const getAdminVolunteers      = (params)        => API.get('/volunteers/admin/all', { params });
export const verifyVolunteer         = (id, data)      => API.put(`/volunteers/admin/${id}/verify`, data);
export const getAdminAlerts          = (params)        => API.get('/volunteers/admin/alerts', { params });

// ── Live Location Sharing ─────────────────────────────────────
export const startLiveShare     = (data)          => API.post('/liveshare/start', data);
export const updateLiveLocation = (id, data)      => API.put(`/liveshare/${id}/update`, data);
export const endLiveShare       = (id)            => API.put(`/liveshare/${id}/end`);
export const getMyLiveSessions  = ()              => API.get('/liveshare/my-sessions');
export const getTrackSession    = (token)         => API.get(`/liveshare/track/${token}`);

// ── Password Reset ─────────────────────────────────────────────
export const forgotPassword = (data)        => API.post('/auth/forgot-password', data);
export const resetPassword  = (token, data) => API.put(`/auth/reset-password/${token}`, data);