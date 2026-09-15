const BANKS = [
  "GTBank",
  "Access Bank",
  "Zenith Bank",
  "First Bank",
  "UBA",
  "Opay",
  "PalmPay",
  "Moniepoint",
  "Kuda",
  "Fidelity",
  "Stanbic IBTC",
  "Sterling",
  "Wema",
];

const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

const DIGIT_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

function wordOrDigitToNumber(normalised) {
  if (DIGIT_WORDS[normalised] != null) return DIGIT_WORDS[normalised];
  const digitMatch = normalised.match(/\b([1-9])\b/);
  if (digitMatch) return Number(digitMatch[1]);
  return null;
}

export function resolveBank(transcript) {
  const normalised = (transcript || "").toLowerCase().trim();

  const number = wordOrDigitToNumber(normalised);
  if (number != null && number >= 1 && number <= 9) {
    return BANKS[number - 1];
  }

  // Fallback: check if transcript contains any bank name directly
  const match = BANKS.find((bank) => normalised.includes(bank.toLowerCase()));
  if (match) return match;

  return transcript;
}

export function resolveNetwork(transcript) {
  const normalised = (transcript || "").toLowerCase().trim();

  const number = wordOrDigitToNumber(normalised);
  if (number != null && number >= 1 && number <= 4) {
    return NETWORKS[number - 1];
  }

  const match = NETWORKS.find((network) => normalised.includes(network.toLowerCase()));
  if (match) return match;

  return transcript;
}

const flows = {
  transfer: [
    {
      field: "bank",
      question:
        "Which bank? Say a number. 1 for GTBank, 2 for Access Bank, 3 for Zenith Bank, 4 for First Bank, 5 for UBA, 6 for Opay, 7 for PalmPay, 8 for Moniepoint, 9 for Kuda. Say more for other banks.",
      confirm: (v) => `${v}.`,
      resolve: resolveBank,
    },
    {
      field: "account_number",
      question: "What is the 10-digit account number?",
      confirm: (v) => `Account number ${v}. Account name is Daniel Olorunda.`,
    },
    {
      field: "amount",
      question: "How much do you want to send?",
      confirm: (v) => `${v}.`,
    },
    {
      field: "narration",
      question: "Any narration? Say skip to continue.",
      confirm: (v) => `${v}.`,
    },
  ],
  data: [
    {
      field: "network",
      question: "Which network? Say 1 for MTN, 2 for Airtel, 3 for Glo, 4 for 9mobile.",
      confirm: (v) => `${v}.`,
      resolve: resolveNetwork,
    },
    {
      field: "phone",
      question: "What is the phone number?",
      confirm: (v) => `${v}.`,
    },
    {
      field: "amount",
      question: "How much?",
      confirm: (v) => `${v} naira.`,
    },
  ],
  airtime: [
    {
      field: "network",
      question: "Which network? Say 1 for MTN, 2 for Airtel, 3 for Glo, 4 for 9mobile.",
      confirm: (v) => `${v}.`,
      resolve: resolveNetwork,
    },
    {
      field: "phone",
      question: "What is the phone number?",
      confirm: (v) => `${v}.`,
    },
    {
      field: "amount",
      question: "How much airtime?",
      confirm: (v) => `${v} naira.`,
    },
  ],
};

export function getFlow(type) {
  return flows[type];
}
