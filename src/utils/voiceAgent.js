import { log } from "./logger.js";

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
    // Convert spoken digit words to numerals, and strip the "it's" prefix
    // browser STT sometimes adds, before extracting digits.
    let converted = t
      .replace(/\bit'?s\b/gi, "")
      .replace(/\beight\b/g, "8")
      .replace(/\beights\b/g, "8")
      .replace(/\bseven\b/g, "7")
      .replace(/\bsix\b/g, "6")
      .replace(/\bfive\b/g, "5")
      .replace(/\bfour\b/g, "4")
      .replace(/\bthree\b/g, "3")
      .replace(/\btwo\b/g, "2")
      .replace(/\bone\b/g, "1")
      .replace(/\bzero\b/g, "0")
      .replace(/\bnine\b/g, "9")
      .replace(/\bnought\b/g, "0")
      .replace(/\boh\b/g, "0");

    const digits = converted.replace(/[^0-9]/g, "");

    const field = currentStep === "account_number" ? "account_number" : "phone";
    const minLen = 8; // accept 8+ digits, validation will check for 10

    if (digits.length >= minLen) {
      return {
        action: "COLLECT_FIELD",
        field,
        value: digits,
        valid: digits.length === 10,
        error: digits.length !== 10 ? `I got ${digits.length} digits. Please say all 10 digits.` : null,
      };
    }

    // Less than 8 digits, try anyway if we got something
    if (digits.length > 0) {
      return {
        action: "COLLECT_FIELD",
        field,
        value: digits,
        valid: false,
        error: `I got ${digits.length} digits. Please say all 10 digits clearly.`,
      };
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
    log.info("AGENT", "Matched", quickResult);
    return quickResult;
  }

  // quickParse covers every screen and conversation step; nothing here needs
  // to fall back to an external model.
  log.info("AGENT", "No match found", { transcript });
  return { action: "UNKNOWN", suggestion: "no match" };
}
