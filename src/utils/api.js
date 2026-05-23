import axios from 'axios';
import { backend, getBackendCandidates } from '../socket';
import { getStoredToken } from './auth';

let activeBackend = backend;

export const api = axios.create({
  baseURL: activeBackend,
});

export const getApiBaseUrl = () => activeBackend;

export const setApiBaseUrl = (nextBaseUrl) => {
  if (!nextBaseUrl) {
    return;
  }

  activeBackend = nextBaseUrl.replace(/\/+$/, '');
  api.defaults.baseURL = activeBackend;
};

export const getApiBaseUrlCandidates = () => {
  const current = getApiBaseUrl();
  return [...new Set([current, ...getBackendCandidates()])];
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const resolvedBaseUrl = (config.baseURL || api.defaults.baseURL || '').replace(/\/+$/, '');
  const requestUrl = `${resolvedBaseUrl}${config.url || ''}`;
  console.debug('[api:request]', {
    method: config.method?.toUpperCase(),
    requestUrl,
    hasToken: Boolean(token),
    contentType: config.headers?.['Content-Type'] || config.headers?.['content-type'] || null,
    payload: config.data || null,
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.debug('[api:response]', {
      status: response.status,
      requestUrl: response.request?.responseURL || `${response.config?.baseURL || ''}${response.config?.url || ''}`,
      contentType: response.headers?.['content-type'] || null,
      preview: typeof response.data === 'string' ? response.data.slice(0, 120) : response.data,
    });

    return response;
  },
  (error) => {
    console.error('[api:error]', {
      message: error.message,
      requestUrl: error.response?.request?.responseURL || `${error.config?.baseURL || ''}${error.config?.url || ''}`,
      status: error.response?.status || null,
      contentType: error.response?.headers?.['content-type'] || null,
      responsePreview: typeof error.response?.data === 'string'
        ? error.response.data.slice(0, 120)
        : error.response?.data || null,
      baseCandidates: getApiBaseUrlCandidates(),
    });

    return Promise.reject(error);
  }
);
