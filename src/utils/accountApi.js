import { api } from './api';

export const updatePassword = async (payload) => {
  const { data } = await api.put('/api/auth/password', payload);
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await api.put('/api/auth/me', payload);
  return data;
};

export const completeOnboarding = async () => {
  const { data } = await api.post('/api/auth/onboarding/complete');
  return data;
};
