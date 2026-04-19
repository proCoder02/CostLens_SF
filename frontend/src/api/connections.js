import client from './client';

export const connectionsAPI = {
  list: () =>
    client.get('/connections/').then((r) => r.data),

  create: (data) =>
    client.post('/connections/', data).then((r) => r.data),

  toggle: (id, isActive) =>
    client.patch(`/connections/${id}`, { is_active: isActive }).then((r) => r.data),

  remove: (id) =>
    client.delete(`/connections/${id}`),
};
