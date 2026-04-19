import client from './client';

export const settingsAPI = {
  // Budgets
  listBudgets: () =>
    client.get('/settings/budgets').then((r) => r.data),

  createBudget: (data) =>
    client.post('/settings/budgets', data).then((r) => r.data),

  updateBudget: (id, data) =>
    client.put(`/settings/budgets/${id}`, data).then((r) => r.data),

  deleteBudget: (id) =>
    client.delete(`/settings/budgets/${id}`),

  // Alert preferences
  getAlertSettings: () =>
    client.get('/settings/alerts').then((r) => r.data),

  updateAlertSettings: (data) =>
    client.patch('/settings/alerts', data).then((r) => r.data),
};
