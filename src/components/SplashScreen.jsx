export default function SplashScreen({ onStart }) {
  return (
    <div className="splash">
      <div className="splash-card">
        <h1 className="splash-title">VoicePay</h1>
        <button className="splash-start" onClick={onStart} aria-label="Tap to start">
          <span aria-hidden="true">🎤</span>
        </button>
        <p className="splash-start-label">Tap to Start</p>
      </div>
      <p className="splash-subtitle">Voice-powered banking for everyone</p>
    </div>
  );
}
