import { useCallback, useRef, useState } from "react";
import { log } from "../utils/logger.js";

// Primary voice input: the browser's own SpeechRecognition API. Instant, no
// WebSocket, no audio chunking, no silence detection — the browser handles
// all of that. Supported on desktop and Android Chrome.
// (Intron Sahara STT is preserved in useSaharaVoiceCommand.js for benchmark
// comparison only.)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoiceCommand({ onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  // The browser can fire onend before a final result ever arrives (e.g. the
  // user trails off instead of pausing cleanly), which would otherwise drop
  // the whole utterance. Track the latest interim result so onend can use it
  // as a fallback "final" transcript.
  const lastPartialRef = useRef("");

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      log.error("STT", "Speech recognition not supported");
      setError("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-NG"; // Nigerian English
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      log.info("STT", "Browser speech recognition started");
      setIsListening(true);
      setTranscript("");
      setError(null);
      lastPartialRef.current = "";
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      if (interimTranscript) {
        lastPartialRef.current = interimTranscript;
        log.info("STT", "Partial transcript", { text: interimTranscript });
        setTranscript(interimTranscript);
      }

      if (finalTranscript) {
        lastPartialRef.current = "";
        log.info("STT", "Final transcript", { text: finalTranscript });
        setTranscript(finalTranscript);
        setIsListening(false);
        onTranscript?.(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      log.error("STT", "Recognition error", { error: event.error });
      setIsListening(false);

      // On no-speech, restart automatically instead of surfacing an error.
      if (event.error === "no-speech") {
        log.info("STT", "No speech detected, restarting");
        setTimeout(() => startListening(), 500);
        return;
      }

      if (event.error !== "aborted") {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      log.info("STT", "Recognition ended");
      setIsListening(false);

      // If we have a partial but never got a final result, use the partial
      // as the transcript so the utterance isn't silently dropped.
      if (lastPartialRef.current && lastPartialRef.current.trim().length > 0) {
        const text = lastPartialRef.current;
        lastPartialRef.current = "";
        log.info("STT", "Using last partial as final", { text });
        onTranscript?.(text);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      log.info("STT", "Stopped manually");
    }
    setIsListening(false);
  }, []);

  return { isListening, transcript, error, startListening, stopListening };
}
