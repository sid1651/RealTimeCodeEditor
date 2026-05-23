import { api, getApiBaseUrl, getApiBaseUrlCandidates, setApiBaseUrl } from './api';

const isHtmlResponse = (payload, headers = {}) => {
  const contentType = headers['content-type'] || headers['Content-Type'] || '';

  if (contentType.toLowerCase().includes('text/html')) {
    return true;
  }

  return typeof payload === 'string' && payload.toLowerCase().includes('<!doctype html>');
};

const assertJsonResponse = (response, fallbackMessage, candidate) => {
  if (isHtmlResponse(response.data, response.headers)) {
    console.error('[roomApi:html-response]', {
      candidate,
      requestUrl: response.request?.responseURL || `${response.config?.baseURL || ''}${response.config?.url || ''}`,
      status: response.status,
      contentType: response.headers?.['content-type'] || null,
      preview: typeof response.data === 'string' ? response.data.slice(0, 200) : response.data,
    });
    throw new Error(fallbackMessage);
  }

  return response.data;
};

const runRoomRequest = async (config, fallbackMessage) => {
  const candidates = getApiBaseUrlCandidates();
  let lastError = null;

  console.debug('[roomApi:start]', {
    activeBaseUrl: getApiBaseUrl(),
    candidates,
    method: config.method,
    url: config.url,
    payload: config.data || null,
  });

  for (const candidate of candidates) {
    try {
      console.debug('[roomApi:attempt]', {
        candidate,
        method: config.method,
        url: config.url,
      });

      const response = await api.request({
        ...config,
        baseURL: candidate,
      });
      const data = assertJsonResponse(response, fallbackMessage, candidate);

      if (candidate !== getApiBaseUrl()) {
        console.info('[roomApi:baseurl-updated]', {
          from: getApiBaseUrl(),
          to: candidate,
        });
        setApiBaseUrl(candidate);
      }

      return data;
    } catch (error) {
      lastError = error;
      const maybeHtmlResponse = error.response && isHtmlResponse(error.response.data, error.response.headers);
      const maybeNetworkFailure = !error.response;

      console.error('[roomApi:attempt-failed]', {
        candidate,
        message: error.message,
        status: error.response?.status || null,
        contentType: error.response?.headers?.['content-type'] || null,
        isHtmlResponse: Boolean(maybeHtmlResponse),
        isNetworkFailure: maybeNetworkFailure,
      });

      if (!maybeHtmlResponse && !maybeNetworkFailure) {
        throw error;
      }
    }
  }

  throw lastError || new Error(fallbackMessage);
};

export const createRoom = async (payload) => {
  return runRoomRequest(
    {
      method: 'post',
      url: '/api/rooms/create',
      data: payload,
    },
    'Room API returned HTML instead of JSON. The browser is reaching a frontend page instead of the Express route.'
  );
};

export const getUserRooms = async (userId) => {
  return runRoomRequest(
    {
      method: 'get',
      url: `/api/rooms/user/${userId}`,
    },
    'Rooms API returned HTML instead of JSON. The browser is reaching a frontend page instead of the Express route.'
  );
};

export const getRoomById = async (roomId) => {
  return runRoomRequest(
    {
      method: 'get',
      url: `/api/rooms/${roomId}`,
    },
    'Room API returned HTML instead of JSON. The browser is reaching a frontend page instead of the Express route.'
  );
};

export const updateRoom = async (roomId, payload) => {
  return runRoomRequest(
    {
      method: 'put',
      url: `/api/rooms/${roomId}`,
      data: payload,
    },
    'Room update API returned HTML instead of JSON. The browser is reaching a frontend page instead of the Express route.'
  );
};

export const deleteRoom = async (roomId) => {
  return runRoomRequest(
    {
      method: 'delete',
      url: `/api/rooms/${roomId}`,
    },
    'Room delete API returned HTML instead of JSON. The browser is reaching a frontend page instead of the Express route.'
  );
};

export const inviteUserToRoom = async (roomId, payload) => {
  return runRoomRequest(
    {
      method: 'post',
      url: `/api/rooms/${roomId}/invite`,
      data: payload,
    },
    'Room invite API returned HTML instead of JSON. The browser is reaching a frontend page instead of the Express route.'
  );
};
