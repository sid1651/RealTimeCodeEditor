import React from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

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
      <div className="roomCodeLoaderHeader">
        <div className="roomCodeLoaderBadge" aria-hidden="true">
          <span className="roomCodeLoaderSpinner" />
        </div>
        <p className="roomCodeLoaderEyebrow">{error ? 'Room paused' : status}</p>
      </div>

      <h1>{error ? 'Could not open this room yet' : title}</h1>
      <p className="roomCodeLoaderText">{error || subtitle}</p>

      {!error && (
        <div className="roomCodeLoaderProgress" aria-label="Room is loading">
          <span className="roomCodeLoaderProgressBar" />
          <div className="roomCodeLoaderMeta">
            <span>Syncing room data</span>
            <span>Please wait</span>
          </div>
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
