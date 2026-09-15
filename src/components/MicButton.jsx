export default function MicButton({ isListening, onToggle }) {
  return (
    <div className="mic-wrap">
      {isListening ? (
        <span className="mic-waveform" aria-hidden="true">
          <span className="mic-waveform-bar" />
          <span className="mic-waveform-bar" />
          <span className="mic-waveform-bar" />
        </span>
      ) : null}
      <span className="mic-hint-pill">{isListening ? "Listening..." : "Tap to speak"}</span>
      <button
        className={`mic-button ${isListening ? "mic-button--listening" : ""}`}
        onClick={onToggle}
        aria-label={isListening ? "Stop listening" : "Start voice command"}
      >
        {isListening ? "■" : "🎤"}
      </button>
    </div>
  );
}
