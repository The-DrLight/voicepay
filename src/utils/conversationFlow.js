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

function validatePhone(value) {
  const digits = (value || "").replace(/\D/g, "");
  const valid = digits.length >= 10 && digits.length <= 11;
  return {
    valid,
    value: digits,
    error: valid
      ? null
      : `I heard ${digits.length} digits. Please say the full phone number clearly.`,
  };
}

function validateAmount(value) {
  const cleaned = (value || "").toString().replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  const valid = !isNaN(num) && num > 0;
  return {
    valid,
    value: valid ? num : value,
    error: valid
      ? null
      : "I did not get a valid amount. Please say an amount like ten thousand naira or five hundred naira.",
  };
}

const flows = {
  transfer: [
    {
      field: "bank",
      question:
        "Which bank? Say a number. 1 for GTBank, 2 for Access Bank, 3 for Zenith Bank, 4 for First Bank, 5 for UBA, 6 for Opay, 7 for PalmPay, 8 for Moniepoint, 9 for Kuda. Say more for other banks.",
      confirm: (v) => `${v}.`,
      resolve: resolveBank,
      validate: (value) => {
        const valid = BANKS.includes(value);
        return {
          valid,
          error: valid
            ? null
            : "I did not catch that bank. Please say a number between 1 and 9, or say the bank name clearly.",
        };
      },
    },
    {
      field: "account_number",
      question: "What is the 10-digit account number? Say each digit clearly.",
      confirm: (v) => `Account number ${v} saved.`,
      validate: (value) => {
        const digits = (value || "").replace(/\D/g, "");
        const valid = digits.length === 10;
        return {
          valid,
          value: digits,
          error: valid
            ? null
            : `I heard ${digits.length} digits. Please say all 10 digits of the account number.`,
        };
      },
    },
    {
      field: "recipient_name",
      question: "What is the recipient name?",
      confirm: (v) => `Got it, sending to ${v}.`,
      validate: (value) => {
        const clean = (value || "").trim();
        const valid = clean.length >= 2 && !clean.match(/^\d+$/);
        return {
          valid,
          value: clean,
          error: valid
            ? null
            : "I did not catch the name. Please say the recipient full name clearly.",
        };
      },
    },
    {
      field: "amount",
      question: "How much do you want to send?",
      confirm: (v) => `${v}.`,
      validate: validateAmount,
    },
    {
      field: "narration",
      question: "Any narration? Say skip to continue.",
      confirm: (v) => `${v}.`,
      validate: (value) => ({ valid: true, value }),
    },
  ],
  data: [
    {
      field: "network",
      question: "Which network? Say 1 for MTN, 2 for Airtel, 3 for Glo, 4 for 9mobile.",
      confirm: (v) => `${v}.`,
      resolve: resolveNetwork,
      validate: (value) => {
        const valid = NETWORKS.includes(value);
        return {
          valid,
          error: valid
            ? null
            : "I did not catch that network. Please say a number between 1 and 4, or say the network name clearly.",
        };
      },
    },
    {
      field: "phone",
      question: "What is the phone number?",
      confirm: (v) => `${v}.`,
      validate: validatePhone,
    },
    {
      field: "amount",
      question: "How much?",
      confirm: (v) => `${v} naira.`,
      validate: validateAmount,
    },
  ],
  airtime: [
    {
      field: "network",
      question: "Which network? Say 1 for MTN, 2 for Airtel, 3 for Glo, 4 for 9mobile.",
      confirm: (v) => `${v}.`,
      resolve: resolveNetwork,
      validate: (value) => {
        const valid = NETWORKS.includes(value);
        return {
          valid,
          error: valid
            ? null
            : "I did not catch that network. Please say a number between 1 and 4, or say the network name clearly.",
        };
      },
    },
    {
      field: "phone",
      question: "What is the phone number?",
      confirm: (v) => `${v}.`,
      validate: validatePhone,
    },
    {
      field: "amount",
      question: "How much airtime?",
      confirm: (v) => `${v} naira.`,
      validate: validateAmount,
    },
  ],
};

export function getFlow(type) {
  return flows[type];
}
