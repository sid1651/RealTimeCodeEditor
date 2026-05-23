import { api } from './api';

export const getRoomSnapshots = async (roomId) => {
  const { data } = await api.get(`/api/rooms/${roomId}/snapshots`);
  return data;
};

export const createRoomSnapshot = async (roomId, payload) => {
  const { data } = await api.post(`/api/rooms/${roomId}/snapshots`, payload);
  return data;
};

export const checkoutRoomSnapshot = async (roomId, snapshotId) => {
  const { data } = await api.post(`/api/rooms/${roomId}/snapshots/${snapshotId}/checkout`);
  return data;
};
