import client from './client';

export const insightsAPI = {
  list: (days = 30) =>
    client.get('/insights/', { params: { days } }).then((r) => r.data),

  summary: (days = 30) =>
    client.get('/insights/summary', { params: { days } }).then((r) => r.data),
};
