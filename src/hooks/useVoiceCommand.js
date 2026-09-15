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
        log.info("STT", "Partial transcript", { text: interimTranscript });
        setTranscript(interimTranscript);
      }

      if (finalTranscript) {
        log.info("STT", "Final transcript", { text: finalTranscript });
        setTranscript(finalTranscript);
        setIsListening(false);
        onTranscript?.(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      log.error("STT", "Recognition error", { error: event.error });
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      log.info("STT", "Recognition ended");
      setIsListening(false);
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
