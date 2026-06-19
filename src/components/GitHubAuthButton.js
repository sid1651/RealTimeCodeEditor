import { useCallback } from 'react';
import { startGitHubAuth, getGitHubClientId } from '../utils/githubAuth';

const GitHubMark = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.58 2 12.22c0 4.5 2.87 8.32 6.84 9.66.5.1.68-.22.68-.5 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .85-.28 2.78 1.05A9.36 9.36 0 0 1 12 6.91c.85 0 1.7.12 2.5.37 1.93-1.33 2.77-1.05 2.77-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.58 5.07.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .28.18.61.69.5A10.25 10.25 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z"
    />
  </svg>
);

const GitHubAuthButton = ({
  disabled = false,
  redirectTarget = '/dashboard',
  intent = 'signin',
  children = 'Continue with GitHub',
  className = 'github-auth-btn',
}) => {
  const handleClick = useCallback(() => {
    startGitHubAuth({ redirectTarget, intent });
  }, [intent, redirectTarget]);

  if (!getGitHubClientId()) {
    return (
      <button type="button" className={className} disabled>
        <GitHubMark />
        <span>GitHub sign-in is not configured</span>
      </button>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={handleClick}>
      <GitHubMark />
      <span>{children}</span>
    </button>
  );
};

export default GitHubAuthButton;
