export const INTENTS = {
  NAVIGATE_TRANSFER: "NAVIGATE_TRANSFER",
  NAVIGATE_DATA: "NAVIGATE_DATA",
  NAVIGATE_AIRTIME: "NAVIGATE_AIRTIME",
  NAVIGATE_HISTORY: "NAVIGATE_HISTORY",
  NAVIGATE_SETTINGS: "NAVIGATE_SETTINGS",
  NAVIGATE_BILLS: "NAVIGATE_BILLS",
  NAVIGATE_HOME: "NAVIGATE_HOME",
  REVEAL_BALANCE: "REVEAL_BALANCE",
  RESTART_LISTENING: "RESTART_LISTENING",
  CONFIRM_TRANSFER: "CONFIRM_TRANSFER",
  CANCEL: "CANCEL",
  UNKNOWN: "UNKNOWN",
};

const INTENT_PHRASES = [
  {
    intent: INTENTS.NAVIGATE_TRANSFER,
    phrases: [
      "send money",
      "transfer money",
      "transfer funds",
      "make transfer",
      "pay someone",
      "send funds",
      "i want to send",
      "send cash",
      "transfer",
      "send",
    ],
  },
  {
    intent: INTENTS.NAVIGATE_DATA,
    phrases: ["buy data", "data bundle", "buy bundle", "get data", "data"],
  },
  {
    intent: INTENTS.NAVIGATE_AIRTIME,
    phrases: ["buy airtime", "top up", "topup", "recharge", "airtime"],
  },
  {
    intent: INTENTS.NAVIGATE_HISTORY,
    phrases: [
      "transaction history",
      "my transactions",
      "recent transactions",
      "show history",
      "what did i spend",
      "transactions",
      "spending",
      "history",
    ],
  },
  {
    intent: INTENTS.NAVIGATE_SETTINGS,
    phrases: ["settings", "setting", "preferences", "change language", "language", "configure"],
  },
  {
    intent: INTENTS.NAVIGATE_BILLS,
    phrases: ["pay bills", "bills", "electricity", "cable tv", "pay light"],
  },
  {
    intent: INTENTS.RESTART_LISTENING,
    phrases: [
      "start mic",
      "start microphone",
      "wake up",
      "hey voicepay",
      "hello voicepay",
      "voicepay",
      "are you there",
      "activate",
      "start listening",
      "listen",
    ],
  },
  {
    intent: INTENTS.CONFIRM_TRANSFER,
    phrases: ["confirm", "yes", "proceed", "okay", "correct", "that is right"],
  },
  {
    intent: INTENTS.CANCEL,
    phrases: ["cancel", "no", "go back", "stop", "wrong"],
  },
  {
    intent: INTENTS.NAVIGATE_HOME,
    phrases: ["go home", "main menu", "dashboard", "home", "back", "menu"],
  },
  {
    intent: INTENTS.REVEAL_BALANCE,
    phrases: [
      "check balance",
      "my balance",
      "how much do i have",
      "show balance",
      "what is my balance",
      "how much",
      "balance",
    ],
  },
];

function normalise(transcript) {
  return transcript
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "");
}

export function parseIntent(transcript) {
  if (!transcript) return INTENTS.UNKNOWN;
  const normalised = normalise(transcript);

  for (const { intent, phrases } of INTENT_PHRASES) {
    if (phrases.some((phrase) => normalised.includes(phrase))) {
      return intent;
    }
  }

  return INTENTS.UNKNOWN;
}
