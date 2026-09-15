const flows = {
  transfer: [
    {
      field: "amount",
      question: "How much do you want to transfer?",
      confirm: (v) => `Got it. ${v}.`,
    },
    {
      field: "bank",
      question: "Which bank?",
      confirm: (v) => `${v}.`,
    },
    {
      field: "account_number",
      question: "Please say the account number.",
      confirm: (v) => `Account number ${v}.`,
    },
    {
      field: "recipient",
      question: "What is the recipient name?",
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
};

export function getFlow(type) {
  return flows[type];
}
