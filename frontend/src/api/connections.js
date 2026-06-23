// import client from './client';

// export const connectionsAPI = {
//   list: () =>
//     client.get('/connections/').then((r) => r.data),

//   create: (data) =>
//     client.post('/connections/', data).then((r) => r.data),

//   toggle: (id, isActive) =>
//     client.patch(`/connections/${id}`, { is_active: isActive }).then((r) => r.data),

//   remove: (id) =>
//     client.delete(`/connections/${id}`),
// };


import client from './client';

export const connectionsAPI = {
  list: () =>
    client.get('/connections/').then((r) => r.data),

  create: (data) =>
    client.post('/connections/', data).then((r) => r.data),
    // data shape for custom:
    // {
    //   provider: 'custom',
    //   display_name: 'RAPEX API',
    //   api_key: '46c92e01...',
    //   base_url: 'https://rapexapi.nodexdata.click',
    //   auth_header: 'X-API-Key',
    //   endpoints: ['/rapex_alerts', '/alerts'],
    //   cost_per_record: 0.01,
    // }

  toggle: (id, isActive) =>
    client.patch(`/connections/${id}`, { is_active: isActive }).then((r) => r.data),

  remove: (id) =>
    client.delete(`/connections/${id}`),
};