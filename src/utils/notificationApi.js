import { api } from './api';

export const getNotifications = async () => {
  const { data } = await api.get('/api/notifications');
  return data;
};

export const markNotificationsRead = async () => {
  const { data } = await api.put('/api/notifications/read-all');
  return data;
};
