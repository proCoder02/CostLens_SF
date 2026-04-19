import client from './client';

export const dashboardAPI = {
  getSummary: (days = 30) =>
    client.get('/dashboard/', { params: { days } }).then((r) => r.data),
};
