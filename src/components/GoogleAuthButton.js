import { useEffect, useRef, useState } from 'react';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const loadGoogleIdentityScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);

  if (existingScript) {
    existingScript.addEventListener('load', resolve, { once: true });
    existingScript.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = GOOGLE_IDENTITY_SCRIPT;
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const GoogleAuthButton = ({ text = 'signin_with', onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderGoogleButton = async () => {
      if (!googleClientId || disabled) {
        return;
      }

      try {
        await loadGoogleIdentityScript();

        if (cancelled || !buttonRef.current) {
          return;
        }

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: Math.min(buttonRef.current.offsetWidth || 360, 400),
        });
        setIsReady(true);
      } catch (error) {
        console.error('Unable to load Google sign-in', error);
      }
    };

    renderGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [disabled, onCredential, text]);

  if (!googleClientId) {
    return (
      <button type="button" className="google-btn" disabled>
        Google sign-in is not configured
      </button>
    );
  }

  return (
    <div className={`googleAuthMount ${isReady ? 'ready' : ''} ${disabled ? 'disabled' : ''}`}>
      <div ref={buttonRef} />
    </div>
  );
};

export default GoogleAuthButton;
