import client from './client';

export const usageAPI = {
  getEndpoints: (days = 30) =>
    client.get('/usage/endpoints', { params: { days } }).then((r) => r.data),

  ingest: (records) =>
    client.post('/usage/ingest', { records }).then((r) => r.data),
};
