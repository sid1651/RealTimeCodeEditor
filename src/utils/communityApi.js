import { api } from './api';

export const getCommunityProjects = async (query = '') => {
  const { data } = await api.get('/api/rooms/community', {
    params: query ? { q: query } : {},
  });
  return data;
};

export const getCommunityProjectDetail = async (roomId) => {
  const { data } = await api.get(`/api/rooms/community/${roomId}`);
  return data;
};

export const updateCommunityProject = async (roomId, payload) => {
  const { data } = await api.put(`/api/rooms/${roomId}/community`, payload);
  return data;
};

export const trackCommunityProjectView = async (roomId) => {
  const { data } = await api.post(`/api/rooms/community/${roomId}/view`);
  return data;
};

export const toggleCommunityProjectLike = async (roomId) => {
  const { data } = await api.post(`/api/rooms/community/${roomId}/like`);
  return data;
};

export const addCommunityProjectComment = async (roomId, payload) => {
  const { data } = await api.post(`/api/rooms/community/${roomId}/comments`, payload);
  return data;
};

export const remixCommunityProject = async (roomId) => {
  const { data } = await api.post(`/api/rooms/community/${roomId}/remix`);
  return data;
};
