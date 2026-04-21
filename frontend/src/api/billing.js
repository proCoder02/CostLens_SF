import client from './client';

export const billingAPI = {
  getPlans: () => client.get('/billing/plans').then((r) => r.data),
  checkout: (plan) => client.post('/billing/checkout', null, { params: { plan } }).then((r) => r.data),
  cancelSubscription: () => client.post('/billing/cancel').then((r) => r.data),
  getHistory: () => client.get('/billing/history').then((r) => r.data),
  getSubscription: () => client.get('/billing/subscription').then((r) => r.data),
};
