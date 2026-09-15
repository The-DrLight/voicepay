export default function SplashScreen({ onStart }) {
  const handleTap = () => {
    console.log("[VP] Splash tapped, starting welcome flow");
    onStart();
  };

  return (
    <div className="splash">
      <div className="splash-top">
        <div className="splash-logo-box" aria-hidden="true">
          VP
        </div>
        <h1 className="splash-wordmark">VoicePay</h1>
        <p className="splash-tagline">Banking without barriers</p>
      </div>

      <div className="splash-bottom">
        <span className="splash-mic-float" aria-hidden="true">
          🎤
        </span>
        <button className="splash-start-pill" onClick={handleTap}>
          Tap to Begin
        </button>
        <p className="splash-footer">Powered by Intron Sahara v2.5</p>
      </div>
    </div>
  );
}
