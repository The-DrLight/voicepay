export default function MicButton({ isListening, onToggle }) {
  return (
    <div className="mic-wrap">
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
