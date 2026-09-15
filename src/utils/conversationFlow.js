const flows = {
  transfer: [
    {
      field: "bank",
      question: "Which bank are you sending to?",
      confirm: (v) => `${v}.`,
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
      question: "Which network? MTN, Airtel, Glo, or 9mobile?",
      confirm: (v) => `${v}.`,
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
      question: "Which network? MTN, Airtel, Glo, or 9mobile?",
      confirm: (v) => `${v}.`,
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
