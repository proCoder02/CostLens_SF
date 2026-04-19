import client from './client';

export const authAPI = {
  register: (data) =>
    client.post('/auth/register', data).then((r) => r.data),

  login: (email, password) =>
    client
      .post('/auth/login', new URLSearchParams({ username: email, password }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then((r) => r.data),

  getMe: () =>
    client.get('/auth/me').then((r) => r.data),
};
