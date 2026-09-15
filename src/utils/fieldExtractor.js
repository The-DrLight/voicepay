const PROMPTS = {
  bank: (transcript) => `Extract only the bank name from this text.
      Return ONLY the bank name, nothing else.
      Valid banks: GTBank, Access Bank, Zenith Bank,
      First Bank, UBA, Stanbic IBTC, Fidelity,
      Sterling, Wema, Kuda, Opay, PalmPay, Moniepoint.
      If no valid bank found, return the most likely
      bank name mentioned.
      Text: "${transcript}"`,

  account_number: (transcript) => `Extract the phone or account number
      from this text. It should be 10 digits.
      Rules:
      - Remove all non-digit characters
      - If you see digits spoken separately like
        "8 1 1 4" treat them as one number "8114"
      - Return ONLY the digits, nothing else
      - If multiple numbers, return the longest one
      - The number should start with common Nigerian
        prefixes: 0, 8, 7, 9 or two digit codes
      Text: "${transcript}"
      Return only digits:`,

  amount: (transcript) => `Extract the naira amount as a number only.
      Rules:
      - "ten thousand" = 10000
      - "five hundred" = 500
      - "two thousand five hundred" = 2500
      - "fifty k" = 50000
      - If only "naira" with no number, return "0"
      - Return ONLY the number, no currency symbol,
        no text
      Text: "${transcript}"
      Return only the number:`,

  narration: (transcript) => `Extract the narration/note/description
      from this text, or return "none" if the person
      said skip or nothing relevant.
      Text: "${transcript}"`,

  network: (transcript) => `Extract only the mobile network name from
      this text. Return ONLY one of: MTN, Airtel, Glo,
      9mobile.
      Text: "${transcript}"`,

  phone: (transcript) => `Extract only the phone number from this text.
      Return ONLY the digits, no spaces.
      Text: "${transcript}"`,

  confirm: (transcript) => `Did the person say yes/confirm/correct/proceed?
      Return ONLY "yes" or "no".
      Text: "${transcript}"`,
};

export async function extractField(field, transcript) {
  const buildPrompt = PROMPTS[field];

  try {
    const response = await fetch("/ai-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: buildPrompt ? buildPrompt(transcript) : transcript,
          },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || transcript;
    console.log(`[VP] Field extracted [${field}]:`, transcript, "->", result);
    return result;
  } catch (err) {
    console.warn("[VP] Field extraction failed, using raw transcript:", err);
    return transcript;
  }
}
