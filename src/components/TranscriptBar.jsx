export default function TranscriptBar({ isListening, transcript, error }) {
  if (!isListening && !transcript && !error) return null;

  return (
    <div className={`transcript-pill${error ? " transcript-pill--error" : ""}`} role="status">
      <span>{error || transcript || "Listening..."}</span>
    </div>
  );
}
