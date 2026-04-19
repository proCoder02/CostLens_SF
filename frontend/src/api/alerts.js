import client from './client';

export const alertsAPI = {
  list: (limit = 20, unreadOnly = false) =>
    client.get('/alerts/', { params: { limit, unread_only: unreadOnly } }).then((r) => r.data),

  unreadCount: () =>
    client.get('/alerts/unread-count').then((r) => r.data),

  markRead: (alertIds) =>
    client.post('/alerts/read', { alert_ids: alertIds }).then((r) => r.data),

  markAllRead: () =>
    client.post('/alerts/read-all').then((r) => r.data),

  triggerCheck: () =>
    client.post('/alerts/check').then((r) => r.data),
};
