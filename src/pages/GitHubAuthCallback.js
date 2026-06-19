import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { consumeGitHubAuthState, getGitHubRedirectUri } from '../utils/githubAuth';

const GitHubAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return undefined;
    }

    hasStartedRef.current = true;
    const finishAuth = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        toast.error(errorDescription || 'GitHub sign-in was cancelled.');
        navigate('/signin', { replace: true });
        return;
      }

      if (!code || !state) {
        toast.error('GitHub did not return a valid authorization response.');
        navigate('/signin', { replace: true });
        return;
      }

      const pendingAuth = consumeGitHubAuthState(state);
      if (!pendingAuth) {
        toast.error('This GitHub sign-in session is no longer valid. Please try again.');
        navigate('/signin', { replace: true });
        return;
      }

      try {
        const { data } = await api.post('/api/auth/github', {
          code,
          redirectUri: getGitHubRedirectUri(),
        });

        login({
          token: data.token,
          user: data.user,
        });

        toast.success(data.message || 'Signed in with GitHub successfully.');
        navigate(pendingAuth.redirectTarget || '/dashboard', { replace: true });
      } catch (authError) {
        toast.error(authError.response?.data?.message || 'Unable to sign in with GitHub.');
        navigate('/signin', { replace: true });
      }
    };

    finishAuth();
  }, [login, navigate, searchParams]);

  return <div className="routeLoader">Finishing GitHub sign-in...</div>;
};

export default GitHubAuthCallback;
