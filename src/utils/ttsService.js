// Points at Vite's dev-server WebSocket proxy (vite.config.js), which injects
// the Authorization header server-side since browsers can't set it on a WS handshake.
const TTS_STREAM_ENDPOINT = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/tts-stream`;
const MAX_CHUNK_CHARS = 80;

let ttsConfig = {
  voice_language: "en",
  voice_accent: "yoruba",
  voice_gender: "female",
};

export function setTTSConfig(config) {
  ttsConfig = { ...ttsConfig, ...config };
}

// Lazily created so the first AudioContext is constructed inside a real user
// gesture (the splash "Tap to Start" click) — autoplay policies otherwise
// start it suspended and audio never plays.
let sharedAudioCtx = null;
function getAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
}

function splitIntoChunks(text, maxLen) {
  const words = text.split(" ");
  const chunks = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return chunks.length ? chunks : [text];
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function playBuffer(audioCtx, buffer) {
  return new Promise((resolve) => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.addEventListener("ended", resolve);
    source.start();
  });
}

async function playViaFallback(fullText) {
  console.warn("[TTS] Streaming returned no audio, falling back to TTS Generate");
  const res = await fetch("/tts-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: fullText,
      voice_language: ttsConfig.voice_language,
      voice_accent: ttsConfig.voice_accent,
      voice_gender: ttsConfig.voice_gender,
    }),
  });
  const data = await res.json();
  if (data?.data?.audio_path) {
    console.log("[TTS] Fallback playing:", data.data.audio_path);
    const audio = new Audio(data.data.audio_path);
    await new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve; // resolve anyway on error
      audio.play().catch(resolve);
    });
  }
}

async function streamAndPlay(text) {
  const fullText = text;
  const chunks = splitIntoChunks(fullText, MAX_CHUNK_CHARS);
  const audioCtx = getAudioContext();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume().catch(() => {});
  }
  let audioPlayed = false;

  // One deferred slot per chunk index so audio plays back in the order the
  // text was split, even if FETCH_AUDIO_CHUNK responses arrive out of order.
  const pendingChunks = chunks.map(() => {
    let resolveChunk;
    const promise = new Promise((resolve) => {
      resolveChunk = resolve;
    });
    return { promise, resolveChunk };
  });

  const params = new URLSearchParams({
    ...ttsConfig,
    output_audio_format: "wav",
  });

  const ws = new WebSocket(`${TTS_STREAM_ENDPOINT}?${params.toString()}`);
  ws.addEventListener("open", () => console.log("[TTS] WS opened"));

  const streamingPromise = new Promise((resolve) => {
    let settled = false;
    let sessionStarted = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (ws.readyState === WebSocket.OPEN) ws.close();
      resolve();
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      console.error("[TTS]", err);
      pendingChunks.forEach(({ resolveChunk }) => resolveChunk(null));
      if (ws.readyState === WebSocket.OPEN) ws.close();
      resolve(); // resolve anyway so the queue does not stall
    };

    // Plays chunk audio strictly in order, starting as soon as chunk 0 is
    // ready rather than waiting for every chunk to be fetched.
    const playSequence = async () => {
      try {
        for (let i = 0; i < pendingChunks.length; i++) {
          const base64Audio = await pendingChunks[i].promise;
          if (!base64Audio) continue;
          try {
            const bytes = base64ToBytes(base64Audio);
            const buffer = await audioCtx.decodeAudioData(bytes.buffer);
            console.log("[TTS] Decoded audio buffer, duration:", buffer.duration);
            console.log("[TTS] Playing chunk", i);
            audioPlayed = true;
            await playBuffer(audioCtx, buffer);
            console.log("[TTS] Chunk", i, "finished playing");
          } catch (err) {
            console.error("[TTS] Chunk playback error:", err);
          }
        }
      } catch (e) {
        console.error("[TTS] Playback error:", e);
      }

      if (!audioPlayed) {
        try {
          await playViaFallback(fullText);
        } catch (err) {
          console.error("[TTS] Fallback playback error:", err);
        }
      }

      finish();
    };

    ws.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (message.message_type) {
        case "SESSION_CREATED":
          sessionStarted = true;
          console.log("[TTS] Session created, sending chunks:", chunks);
          chunks.forEach((chunk, index) => {
            ws.send(
              JSON.stringify({ message_type: "INPUT_TEXT_CHUNK", text: chunk, ack_id: index })
            );
          });
          chunks.forEach((_, index) => {
            ws.send(JSON.stringify({ message_type: "FETCH_AUDIO_CHUNK", chunk_id: index }));
          });
          ws.send(JSON.stringify({ message_type: "COMMIT" }));
          playSequence();
          break;

        case "FETCH_AUDIO_CHUNK": {
          const chunkId = message.chunk_id ?? message.data?.chunk_id ?? message.ack_id;
          const audioBase64 = message.audio_base_64 ?? message.data?.audio_base_64;
          console.log("[TTS] Got audio chunk, base64 length:", audioBase64?.length);
          if (typeof chunkId !== "number" || !pendingChunks[chunkId]) break;

          if (!audioBase64 || audioBase64.length === 0) {
            console.warn("[TTS] Empty audio chunk received, skipping:", chunkId);
            // resolve this chunk's deferred so playback does not hang
            pendingChunks[chunkId].resolveChunk(null);
            break;
          }

          pendingChunks[chunkId].resolveChunk(audioBase64);
          break;
        }

        case "AUTHENTICATION_ERROR":
        case "QUOTA_EXCEEDED":
        case "SESSION_TIME_LIMIT_EXCEEDED":
          fail(new Error(`TTS stream error: ${message.message_type}`));
          break;

        default:
          break;
      }
    };

    ws.onerror = () => fail(new Error("TTS WebSocket error"));

    ws.onclose = () => {
      // Unblock any chunk still awaited by playSequence() so a server-side
      // close never hangs it — but only playSequence's own finish() (after
      // the last real audio buffer stops playing) may resolve the outer
      // promise. Resolving here unconditionally would let speak() return
      // while audio is still playing, which is the exact bug this streaming
      // rewrite needs to avoid (mic re-opening onto the tail of the TTS).
      pendingChunks.forEach(({ resolveChunk }) => resolveChunk(null));
      if (!sessionStarted) {
        fail(new Error("TTS stream closed before session started"));
      }
    };
  });

  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => {
      console.warn("[TTS] Timeout reached, continuing");
      resolve();
    }, 15000)
  );

  await Promise.race([streamingPromise, timeoutPromise]);
}

let queue = Promise.resolve();

export function speak(text) {
  queue = queue.then(() => streamAndPlay(text)).catch((err) => {
    console.error("[TTS]", err);
  });
  return queue;
}
