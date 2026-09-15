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

// Catches the common, unambiguous commands immediately so navigation still
// works if Groq is slow, down, or returns something we can't parse.
function quickParse(text, screen) {
  const t = text.toLowerCase().trim();
  if (t.includes("send money") || t.includes("transfer") || t.includes("send am"))
    return { action: "NAVIGATE", screen: "transfer" };
  if (t.includes("airtime") || t.includes("recharge")) return { action: "NAVIGATE", screen: "airtime" };
  if (t.includes("buy data") || t.includes("data bundle")) return { action: "NAVIGATE", screen: "data" };
  if (t.includes("history") || t.includes("transactions")) return { action: "NAVIGATE", screen: "history" };
  if (t.includes("settings")) return { action: "NAVIGATE", screen: "settings" };
  if (t.includes("go home") || t.includes("dashboard") || t.includes("go back") || t.includes("cancel"))
    return { action: "NAVIGATE", screen: "home" };
  if (t.includes("balance")) return { action: "REVEAL_BALANCE" };
  if (screen !== "home" && (t.includes("confirm") || t.includes("yes") || t === "correct" || t === "proceed"))
    return { action: "CONFIRM" };
  if (t.includes("hey voicepay") || t.includes("start mic") || t.includes("wake up"))
    return { action: "RESTART_MIC" };
  return null; // let Groq handle it
}

export async function processCommand(transcript, context) {
  log.info("AGENT", "Processing transcript", { transcript, screen: context.currentScreen });

  // Only short-circuit outside an in-progress conversation step, so field
  // collection (which can legitimately contain words like "cancel" as a
  // recipient name) still goes through Groq for context-aware extraction.
  if (!context.conversationStep) {
    const quickCheck = quickParse(transcript, context.currentScreen);
    if (quickCheck) {
      log.info("AGENT", "Quick parse matched", quickCheck);
      return quickCheck;
    }
  }

  const systemPrompt = SYSTEM_PROMPT(context);

  try {
    const response = await fetch("/ai-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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
