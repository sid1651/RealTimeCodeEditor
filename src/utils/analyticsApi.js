import { api } from './api';

export const getRoomAnalytics = async (userId) => {
  const { data } = await api.get(`/api/rooms/analytics/user/${userId}`);
  return data;
};
