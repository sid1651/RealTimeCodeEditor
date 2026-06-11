import { api } from './api';

export const executeCode = async (payload) => {
  const response = await api.post('/api/execute', payload);
  return response.data;
};
