import { log } from "./logger.js";

const SYSTEM_PROMPT = (context) => `You are VoicePay, an AI banking
assistant for visually impaired users in Nigeria.
You understand English, Yoruba-English, and Nigerian
Pidgin-English.

Current screen: ${context.currentScreen}
Current conversation step: ${context.conversationStep || "none"}
Data collected so far: ${JSON.stringify(context.collectedData || {})}

Available actions you can return:
- NAVIGATE: { action: "NAVIGATE", screen: "home|transfer|airtime|data|bills|history|settings" }
- COLLECT_FIELD: { action: "COLLECT_FIELD", field: "bank|account_number|recipient_name|amount|narration|network|phone|confirm", value: "extracted value", valid: true|false, error: "reason if invalid" }
- CONFIRM: { action: "CONFIRM" }
- CANCEL: { action: "CANCEL" }
- REVEAL_BALANCE: { action: "REVEAL_BALANCE" }
- RESTART_MIC: { action: "RESTART_MIC" }
- UNKNOWN: { action: "UNKNOWN", suggestion: "what you think they meant" }

Rules:
1. If on home screen and user says anything about
   sending money, transfer, paying someone: NAVIGATE transfer
2. If on home screen and user says airtime, recharge,
   top up: NAVIGATE airtime
3. If on home screen and user says data, bundle,
   internet: NAVIGATE data
4. If on home screen and user says bills, electricity,
   cable, DSTV: NAVIGATE bills
5. If on home screen and user says history,
   transactions: NAVIGATE history
6. If on home screen and user says settings,
   language: NAVIGATE settings
7. If user says go back, return, home, dashboard,
   cancel from ANY screen: NAVIGATE home
8. If user says hey voicepay, start mic, wake up,
   are you there: RESTART_MIC
9. If user says balance, how much: REVEAL_BALANCE
10. If in a conversation step (conversationStep is not null):
    Extract the value for that field from the transcript.
    Validate it:
    - bank: must be a Nigerian bank name or number 1-9
      mapping to bank list
    - account_number: extract digits only, must be 10 digits
    - recipient_name: must be at least 2 chars, not just numbers
    - amount: convert words to numbers, must be > 0
    - narration: always valid, "skip" = ""
    - network: MTN/Airtel/Glo/9mobile or number 1-4
    - phone: digits only, 10-11 digits
    - confirm: "yes/confirm/correct/proceed" = CONFIRM,
      "no/cancel/wrong/back" = CANCEL
11. For bank selection, map numbers to banks:
    1=GTBank, 2=Access Bank, 3=Zenith Bank, 4=First Bank,
    5=UBA, 6=Opay, 7=PalmPay, 8=Moniepoint, 9=Kuda
12. Understand Nigerian speech patterns:
    "send am" = send money
    "how e dey" about balance = REVEAL_BALANCE
    "e don do" = confirm/done
    "make I go back" = NAVIGATE home
    "abeg" = please (ignore, focus on the action word)

Return ONLY a JSON object, no explanation, no markdown.`;

// Catches the common, unambiguous commands (and, per conversation step, the
// field collection itself) immediately so the app keeps working end to end
// if Groq is slow, down, or returns something we can't parse.
function quickParse(text, currentStep) {
  const t = text
    .toLowerCase()
    .replace(/[.,!?]/g, "")
    .trim();

  // Always handle these regardless of step
  if (t.includes("go back") || t.includes("cancel") || t.includes("go home") || t === "back")
    return { action: "CANCEL" };
  if (
    t.includes("confirm") ||
    t === "yes" ||
    t === "correct" ||
    t === "proceed" ||
    t === "e don do" ||
    t.includes("send it")
  )
    return { action: "CONFIRM" };
  if (t.includes("hey voicepay") || t.includes("start mic") || t.includes("wake up"))
    return { action: "RESTART_MIC" };

  // Handle conversation steps directly
  if (currentStep === "bank") {
    const bankMap = {
      1: "GTBank",
      one: "GTBank",
      2: "Access Bank",
      two: "Access Bank",
      3: "Zenith Bank",
      three: "Zenith Bank",
      4: "First Bank",
      four: "First Bank",
      5: "UBA",
      five: "UBA",
      6: "Opay",
      six: "Opay",
      opay: "Opay",
      7: "PalmPay",
      seven: "PalmPay",
      palmpay: "PalmPay",
      8: "Moniepoint",
      eight: "Moniepoint",
      moniepoint: "Moniepoint",
      9: "Kuda",
      nine: "Kuda",
      kuda: "Kuda",
      gtbank: "GTBank",
      "gt bank": "GTBank",
      access: "Access Bank",
      zenith: "Zenith Bank",
      "first bank": "First Bank",
      uba: "UBA",
      wema: "Wema",
      fidelity: "Fidelity",
    };
    for (const [key, bank] of Object.entries(bankMap)) {
      if (t.includes(key)) {
        return { action: "COLLECT_FIELD", field: "bank", value: bank, valid: true };
      }
    }
  }

  if (currentStep === "network_airtime" || currentStep === "network_data") {
    const netMap = {
      1: "MTN",
      one: "MTN",
      mtn: "MTN",
      2: "Airtel",
      two: "Airtel",
      airtel: "Airtel",
      3: "Glo",
      three: "Glo",
      glo: "Glo",
      4: "9mobile",
      four: "9mobile",
      "9mobile": "9mobile",
      etisalat: "9mobile",
    };
    for (const [key, net] of Object.entries(netMap)) {
      if (t.includes(key)) {
        return { action: "COLLECT_FIELD", field: "network", value: net, valid: true };
      }
    }
  }

  if (currentStep === "amount" || currentStep === "amount_airtime") {
    // Convert common Nigerian amount expressions
    let amount = t;
    amount = amount.replace("thousand", "000");
    amount = amount.replace("hundred", "00");
    amount = amount.replace("k", "000");
    amount = amount.replace("naira", "");
    amount = amount.replace("ngn", "");
    const numWords = {
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      ten: "10",
      twenty: "20",
      thirty: "30",
      forty: "40",
      fifty: "50",
    };
    for (const [word, num] of Object.entries(numWords)) {
      amount = amount.replace(word, num);
    }
    const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!isNaN(num) && num > 0) {
      return { action: "COLLECT_FIELD", field: "amount", value: num.toString(), valid: true };
    }
  }

  if (currentStep === "account_number" || currentStep === "phone_airtime" || currentStep === "phone_data") {
    const digits = t.replace(/[^0-9]/g, "");
    const field = currentStep === "account_number" ? "account_number" : "phone";
    const minLen = 10;
    if (digits.length >= minLen) {
      return { action: "COLLECT_FIELD", field, value: digits, valid: true };
    }
  }

  if (currentStep === "recipient_name") {
    const clean = text.trim();
    if (clean.length >= 2 && !/^\d+$/.test(clean)) {
      return { action: "COLLECT_FIELD", field: "recipient_name", value: clean, valid: true };
    }
  }

  if (currentStep === "narration") {
    const value = t.includes("skip") ? "" : text.trim();
    return { action: "COLLECT_FIELD", field: "narration", value, valid: true };
  }

  if (currentStep === "awaiting_confirm") {
    if (t.includes("confirm") || t === "yes" || t.includes("correct") || t.includes("proceed") || t.includes("send") || t.includes("e don do"))
      return { action: "CONFIRM" };
    if (t.includes("no") || t.includes("cancel") || t.includes("back") || t.includes("wrong"))
      return { action: "CANCEL" };
  }

  // Home screen navigation (only when no active step)
  if (!currentStep) {
    if (t.includes("send money") || t.includes("transfer") || t.includes("send am"))
      return { action: "NAVIGATE", screen: "transfer" };
    if (t.includes("airtime") || t.includes("recharge")) return { action: "NAVIGATE", screen: "airtime" };
    if (t.includes("buy data") || t.includes("data")) return { action: "NAVIGATE", screen: "data" };
    if (t.includes("bills") || t.includes("electricity")) return { action: "NAVIGATE", screen: "bills" };
    if (t.includes("history") || t.includes("transactions")) return { action: "NAVIGATE", screen: "history" };
    if (t.includes("settings")) return { action: "NAVIGATE", screen: "settings" };
    if (t.includes("balance")) return { action: "REVEAL_BALANCE" };
  }

  return null;
}

export async function processCommand(transcript, context) {
  log.info("AGENT", "Processing transcript", { transcript, screen: context.currentScreen });

  const quickResult = quickParse(transcript, context.conversationStep);
  if (quickResult) {
    log.info("AGENT", "Quick parse matched", quickResult);
    return quickResult;
  }

  const systemPrompt = SYSTEM_PROMPT(context);

  try {
    const response = await fetch("/ai-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();

    if (data.error) {
      log.error("AGENT", "Groq API error", data.error);
      return { action: "UNKNOWN", suggestion: "API error" };
    }

    const rawContent = data.choices[0].message.content;
    log.info("AGENT", "Groq raw response", { content: rawContent });

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (parseErr) {
      log.error("AGENT", "JSON parse failed", { error: parseErr.message, content: rawContent });
      // Try to extract action manually
      if (rawContent.includes("NAVIGATE")) {
        const screenMatch = rawContent.match(/"screen":\s*"(\w+)"/);
        result = { action: "NAVIGATE", screen: screenMatch?.[1] || "home" };
      } else {
        result = { action: "UNKNOWN", suggestion: rawContent };
      }
    }

    log.info("AGENT", "Decision made", result);
    return result;
  } catch (err) {
    log.error("AGENT", "Processing failed", { error: err.message });
    return { action: "UNKNOWN", suggestion: err.message };
  }
}
