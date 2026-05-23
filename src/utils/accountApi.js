import { api } from './api';

export const updatePassword = async (payload) => {
  const { data } = await api.put('/api/auth/password', payload);
  return data;
};
