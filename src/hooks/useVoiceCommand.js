import { useCallback, useRef, useState } from "react";

// Points at Vite's dev-server WebSocket proxy (vite.config.js), which injects
// the Authorization header server-side since browsers can't set it on a WS handshake.
const STT_ENDPOINT = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/stt-stream`;
const SAMPLE_RATE = 16000;
const MIN_CHUNK_BYTES = 1200;
const SILENCE_THRESHOLD = 0.02; // RMS energy below this counts as silence
const SILENCE_DURATION_MS = 2200; // stop after this much continuous silence
const MIN_SPEECH_DURATION_MS = 1500; // ignore silence during the opening beat

const ERROR_MESSAGES = {
  AUTHENTICATION_ERROR: "Voice authentication failed. Check your API key.",
  QUOTA_EXCEEDED: "Voice quota exceeded. Please try again later.",
  SESSION_TIME_LIMIT_EXCEEDED: "Voice session timed out.",
};

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useVoiceCommand({ onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const sessionReadyRef = useRef(false);
  const pendingChunksRef = useRef([]);
  const pendingBytesRef = useRef(0);
  const silenceStartRef = useRef(null);
  const speechStartTimeRef = useRef(0);
  // stopListening is defined below (after startAudioCapture) but the
  // silence-detection code inside startAudioCapture's onaudioprocess handler
  // needs to call it, so the latest reference is stashed here each render.
  const stopListeningRef = useRef(null);

  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sessionReadyRef.current = false;
    pendingChunksRef.current = [];
    pendingBytesRef.current = 0;
  }, []);

  const flushAudioBuffer = useCallback(() => {
    if (pendingBytesRef.current === 0 || wsRef.current?.readyState !== WebSocket.OPEN) return;

    const combined = new Uint8Array(pendingBytesRef.current);
    let offset = 0;
    for (const chunk of pendingChunksRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    pendingChunksRef.current = [];
    pendingBytesRef.current = 0;

    const audioBase64 = arrayBufferToBase64(combined.buffer);
    wsRef.current.send(
      JSON.stringify({ message_type: "INPUT_AUDIO_CHUNK", audio_base_64: audioBase64 })
    );
  }, []);

  const startAudioCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    speechStartTimeRef.current = Date.now();
    silenceStartRef.current = null;

    processor.onaudioprocess = (event) => {
      if (!sessionReadyRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;

      const samples = event.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(samples);
      pendingChunksRef.current.push(new Uint8Array(pcm16));
      pendingBytesRef.current += pcm16.byteLength;
      if (pendingBytesRef.current >= MIN_CHUNK_BYTES) {
        flushAudioBuffer();
      }

      let sumSquares = 0;
      for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
      const rms = Math.sqrt(sumSquares / samples.length);

      const elapsed = Date.now() - speechStartTimeRef.current;
      if (elapsed > MIN_SPEECH_DURATION_MS) {
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else {
            const silenceDuration = Date.now() - silenceStartRef.current;
            console.log(
              "[VP] Silence detected, RMS:",
              rms.toFixed(4),
              "duration:",
              silenceDuration,
              "ms"
            );
            if (silenceDuration > SILENCE_DURATION_MS) {
              silenceStartRef.current = null;
              stopListeningRef.current?.();
            }
          }
        } else {
          silenceStartRef.current = null;
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [flushAudioBuffer]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript("");

    const params = new URLSearchParams({
      use_language_asr_input: "en",
      sample_rate: String(SAMPLE_RATE),
      bit_rate: "16",
      num_channels: "1",
    });

    const ws = new WebSocket(`${STT_ENDPOINT}?${params.toString()}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (message.message_type) {
        case "SESSION_CREATED":
          sessionReadyRef.current = true;
          startAudioCapture().catch((err) => {
            setError(err.message || "Microphone access failed.");
            cleanupAudio();
            ws.close();
          });
          break;

        case "PARTIAL_TRANSCRIPT": {
          const partial = message.transcript ?? message.data?.transcript ?? "";
          console.log("[STT] Partial:", partial);
          setTranscript(partial);
          break;
        }

        case "COMMITTED_TRANSCRIPT": {
          const finalTranscript = message.transcript_text ?? message.data?.transcript ?? "";
          setTranscript(finalTranscript);
          onTranscript?.(finalTranscript);
          ws.close();
          break;
        }

        case "AUTHENTICATION_ERROR":
        case "QUOTA_EXCEEDED":
        case "SESSION_TIME_LIMIT_EXCEEDED":
          setError(ERROR_MESSAGES[message.message_type]);
          cleanupAudio();
          ws.close();
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      setError("Voice connection error.");
    };

    ws.onclose = () => {
      wsRef.current = null;
      setIsListening(false);
    };

    setIsListening(true);
  }, [cleanupAudio, startAudioCapture]);

  const stopListening = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      flushAudioBuffer();
      cleanupAudio();
      wsRef.current.send(JSON.stringify({ message_type: "COMMIT" }));
    } else {
      cleanupAudio();
      setIsListening(false);
    }
  }, [cleanupAudio, flushAudioBuffer]);

  stopListeningRef.current = stopListening;

  return { isListening, transcript, error, startListening, stopListening };
}
