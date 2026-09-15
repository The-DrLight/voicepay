const LOG_ENDPOINT = "/log";

async function sendLog(level, tag, message, data) {
  // Always log to browser console too
  const consoleMsg = `[${tag}] ${message}`;
  if (level === "error") {
    console.error(consoleMsg, data || "");
  } else {
    console.log(consoleMsg, data || "");
  }

  // Send to server (fire and forget, never block)
  try {
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, tag, message, data }),
    }).catch(() => {}); // silently ignore network errors
  } catch (e) {}
}

export const log = {
  info: (tag, message, data) => sendLog("info", tag, message, data),
  error: (tag, message, data) => sendLog("error", tag, message, data),
  warn: (tag, message, data) => sendLog("warn", tag, message, data),
};
