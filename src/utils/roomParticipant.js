const createParticipantId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getRoomParticipantId = (roomId, suppliedParticipantId) => {
  const storageKey = `roomParticipantId_${roomId}`;

  if (suppliedParticipantId) {
    sessionStorage.setItem(storageKey, suppliedParticipantId);
    return suppliedParticipantId;
  }

  const storedParticipantId = sessionStorage.getItem(storageKey);
  if (storedParticipantId) {
    return storedParticipantId;
  }

  const participantId = createParticipantId();
  sessionStorage.setItem(storageKey, participantId);
  return participantId;
};
