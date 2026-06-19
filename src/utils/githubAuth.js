const GITHUB_AUTH_STORAGE_KEY = 'kodikos_github_oauth';

export const getGitHubClientId = () => process.env.REACT_APP_GITHUB_CLIENT_ID || '';

export const getGitHubRedirectUri = () => {
  if (process.env.REACT_APP_GITHUB_REDIRECT_URI) {
    return process.env.REACT_APP_GITHUB_REDIRECT_URI;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/auth/github/callback`;
};

const createStateToken = () => {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const startGitHubAuth = ({ redirectTarget = '/dashboard', intent = 'signin' } = {}) => {
  const clientId = getGitHubClientId();
  const redirectUri = getGitHubRedirectUri();

  if (!clientId) {
    throw new Error('GitHub sign-in is not configured. Set REACT_APP_GITHUB_CLIENT_ID in the client environment.');
  }

  if (!redirectUri) {
    throw new Error('GitHub sign-in redirect URI is not configured.');
  }

  const state = createStateToken();
  const payload = {
    state,
    redirectTarget,
    intent,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(GITHUB_AUTH_STORAGE_KEY, JSON.stringify(payload));

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user user:email');
  authorizeUrl.searchParams.set('state', state);

  window.location.assign(authorizeUrl.toString());
};

export const consumeGitHubAuthState = (incomingState) => {
  const raw = window.localStorage.getItem(GITHUB_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(GITHUB_AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.state || parsed.state !== incomingState) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
