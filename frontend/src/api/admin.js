import client from './client';

export const adminAPI = {
  getStats: () => client.get('/admin/stats').then((r) => r.data),
  getRevenueChart: (days = 30) => client.get('/admin/revenue-chart', { params: { days } }).then((r) => r.data),
  getUsers: (skip = 0, limit = 50, search = '', plan = '') =>
    client.get('/admin/users', { params: { skip, limit, search, plan } }).then((r) => r.data),
  getUserDetail: (userId) => client.get(`/admin/users/${userId}`).then((r) => r.data),
  changeUserPlan: (userId, plan) => client.patch(`/admin/users/${userId}/plan`, null, { params: { plan } }).then((r) => r.data),
  toggleUserActive: (userId) => client.patch(`/admin/users/${userId}/toggle-active`).then((r) => r.data),
  updateUserNotes: (userId, notes) => client.patch(`/admin/users/${userId}/notes`, null, { params: { notes } }).then((r) => r.data),
  getPayments: (skip = 0, limit = 50, status = '') =>
    client.get('/admin/payments', { params: { skip, limit, status } }).then((r) => r.data),
  refundPayment: (paymentId) => client.post(`/admin/payments/${paymentId}/refund`).then((r) => r.data),
  getConfig: () => client.get('/admin/config').then((r) => r.data),
  updateConfig: (data) => client.patch('/admin/config', data).then((r) => r.data),
  getAuditLog: (limit = 50) => client.get('/admin/audit-log', { params: { limit } }).then((r) => r.data),
};
