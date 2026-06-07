import React from 'react';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';

const RoomCodeLoader = ({
  title = 'Opening room',
  subtitle = 'Restoring your saved workspace before collaboration starts.',
  status = 'Preparing the room',
  error = '',
  onRetry,
  onBack,
}) => (
  <main className="roomCodeLoaderPage">
    <section className="roomCodeLoaderCard">
      <div className="roomCodeLoaderAura" aria-hidden="true" />
      <div className="roomCodeLoaderOrb" aria-hidden="true">
        <span className="roomCodeLoaderRing roomCodeLoaderRingOne" />
        <span className="roomCodeLoaderRing roomCodeLoaderRingTwo" />
        <span className="roomCodeLoaderCore">
          <Sparkles size={34} />
        </span>
        <span className="roomCodeLoaderDot roomCodeLoaderDotOne" />
        <span className="roomCodeLoaderDot roomCodeLoaderDotTwo" />
        <span className="roomCodeLoaderDot roomCodeLoaderDotThree" />
      </div>

      <p className="roomCodeLoaderEyebrow">{error ? 'Room paused' : status}</p>
      <h1>{error ? 'Could not open this room yet' : title}</h1>
      <p className="roomCodeLoaderText">{error || subtitle}</p>

      {!error && (
        <div className="roomCodeLoaderSteps" aria-label="Room is loading">
          <span />
          <span />
          <span />
        </div>
      )}

      {error && (
        <div className="roomCodeLoaderActions">
          {onRetry && (
            <button type="button" className="roomCodeLoaderPrimaryBtn" onClick={onRetry}>
              <RefreshCw size={18} />
              Retry
            </button>
          )}
          {onBack && (
            <button type="button" className="roomCodeLoaderSecondaryBtn" onClick={onBack}>
              <ArrowLeft size={18} />
              Back to dashboard
            </button>
          )}
        </div>
      )}
    </section>
  </main>
);

export default RoomCodeLoader;
