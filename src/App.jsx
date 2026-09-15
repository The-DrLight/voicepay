import { useEffect, useRef, useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import Transfer from "./components/Transfer";
import Airtime from "./components/Airtime";
import DataAirtime from "./components/DataAirtime";
import Bills from "./components/Bills";
import History from "./components/History";
import Settings from "./components/Settings";
import MicButton from "./components/MicButton";
import TranscriptBar from "./components/TranscriptBar";
import SplashScreen from "./components/SplashScreen";
import AppHeader from "./components/AppHeader";
import { useVoiceCommand } from "./hooks/useVoiceCommand";
import { parseIntent, INTENTS } from "./utils/intentParser";
import { speak } from "./utils/ttsService";
import { getFlow } from "./utils/conversationFlow";
import { extractField } from "./utils/fieldExtractor";

const SCREEN_NAMES = {
  home: "Dashboard",
  transfer: "Transfer",
  airtime: "Buy Airtime",
  data: "Buy Data",
  bills: "Pay Bills",
  history: "History",
  settings: "Settings",
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("home");
  const [revealBalance, setRevealBalance] = useState(false);
  const [transferDetails, setTransferDetails] = useState({});
  const [dataDetails, setDataDetails] = useState({});
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  // null | { type: 'transfer' | 'data' | 'airtime', stepIndex, collected }
  const [convFlow, setConvFlow] = useState(null);

  const isMountedRef = useRef(true);
  // startListening isn't available until useVoiceCommand returns it below,
  // but onTranscript (passed into that same call) needs to trigger it later —
  // so it's stashed in a ref once available instead of closed over directly.
  const startListeningRef = useRef(null);
  // Set to false by a manual mic-button stop so an auto-restart already in
  // flight (waiting on a speak() promise) doesn't reopen the mic right after.
  const autoRestartEnabledRef = useRef(true);
  // onTranscript below is captured once by useVoiceCommand's internal
  // useCallback (its deps never change), so it always sees stale state
  // unless read through a ref.
  const currentScreenRef = useRef(currentScreen);
  const transferDetailsRef = useRef(transferDetails);
  const dataDetailsRef = useRef(dataDetails);
  const convFlowRef = useRef(null);

  useEffect(() => {
    console.log("[VP] App mounted");
  }, []);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    transferDetailsRef.current = transferDetails;
  }, [transferDetails]);

  useEffect(() => {
    dataDetailsRef.current = dataDetails;
  }, [dataDetails]);

  const navigate = (screen, triggeredBy) => {
    console.log("[VP] ── NAVIGATE ──────────────────");
    console.log("[VP] From:", currentScreenRef.current);
    console.log("[VP] To:", screen);
    console.log("[VP] Triggered by:", triggeredBy ?? "(programmatic)");
    setCurrentScreen(screen);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return `₦${num.toLocaleString("en-NG")}`;
  };

  const handleIntent = (intent) => {
    switch (intent) {
      case INTENTS.NAVIGATE_TRANSFER:
        navigate("transfer");
        return speak("Opening transfer.").then(async () => {
          console.log("[VP] TTS speaking: Opening transfer.");
          const flow = getFlow("transfer");
          const newConv = { type: "transfer", stepIndex: 0, collected: {} };
          setConvFlow(newConv);
          convFlowRef.current = newConv;
          await speak(flow[0].question);
        });
      case INTENTS.NAVIGATE_AIRTIME:
        navigate("airtime");
        return speak("Opening airtime.").then(async () => {
          console.log("[VP] TTS speaking: Opening airtime.");
          const flow = getFlow("airtime");
          const newConv = { type: "airtime", stepIndex: 0, collected: {} };
          setConvFlow(newConv);
          convFlowRef.current = newConv;
          await speak(flow[0].question);
        });
      case INTENTS.NAVIGATE_DATA:
        navigate("data");
        return speak("Opening data.").then(async () => {
          console.log("[VP] TTS speaking: Opening data.");
          const flow = getFlow("data");
          const newConv = { type: "data", stepIndex: 0, collected: {} };
          setConvFlow(newConv);
          convFlowRef.current = newConv;
          await speak(flow[0].question);
        });
      case INTENTS.NAVIGATE_BILLS:
        navigate("bills");
        return speak("Opening bills.");
      case INTENTS.NAVIGATE_HISTORY:
        navigate("history");
        return speak("Here are your recent transactions.");
      case INTENTS.NAVIGATE_SETTINGS:
        navigate("settings");
        return speak("Opening settings. Say English, Yoruba, or Pidgin to change your voice language.");
      case INTENTS.NAVIGATE_HOME:
        navigate("home");
        return speak("You are on the dashboard.");
      case INTENTS.REVEAL_BALANCE:
        setRevealBalance(true);
        navigate("home");
        return speak("Your balance is two hundred and forty seven thousand, five hundred naira.");
      case INTENTS.RESTART_LISTENING:
        // Explicit user request to wake the mic, so it fires even if a
        // manual stop had disabled auto-restart.
        autoRestartEnabledRef.current = true;
        return speak("I am listening.");
      case INTENTS.CONFIRM_TRANSFER: {
        if (currentScreenRef.current === "transfer") {
          const d = transferDetailsRef.current;
          if (d.amount && d.bank) {
            console.log("[VP] Transfer details collected:", d);
            setTransferDetails({});
            transferDetailsRef.current = {};
            navigate("home");
            return speak(
              `Transfer of ${formatAmount(d.amount)} to ${d.recipient_name} was successful. Returning to dashboard.`
            );
          }
        }
        if (currentScreenRef.current === "data" || currentScreenRef.current === "airtime") {
          const d = dataDetailsRef.current;
          if (d.amount && d.network && d.phone) {
            console.log("[VP] Transfer details collected:", d);
            setDataDetails({});
            dataDetailsRef.current = {};
            navigate("home");
            return speak("Purchase confirmed. Returning to dashboard.");
          }
        }
        return Promise.resolve();
      }
      case INTENTS.CANCEL:
        setTransferDetails({});
        setDataDetails({});
        transferDetailsRef.current = {};
        dataDetailsRef.current = {};
        convFlowRef.current = null;
        setConvFlow(null);
        navigate("home");
        return speak("Cancelled. Returning to dashboard.");
      default:
        console.log("[VP] Error: unrecognised intent");
        return Promise.resolve();
    }
  };

  const { isListening, transcript, error, startListening, stopListening } = useVoiceCommand({
    onTranscript: async (text) => {
      console.log("[VP] Voice command received:", text);

      if (convFlowRef.current) {
        const { type, stepIndex, collected } = convFlowRef.current;
        const flow = getFlow(type);
        const currentStep = flow[stepIndex];

        console.log("[VP] ── CONVERSATION ─────────────");
        console.log("[VP] Flow type:", type);
        console.log("[VP] Step index:", stepIndex);
        console.log("[VP] Current field:", currentStep.field);
        console.log("[VP] Raw transcript:", text);

        const cleanValue = currentStep.resolve
          ? currentStep.resolve(text)
          : await extractField(currentStep.field, text);
        console.log("[VP] After Groq clean:", cleanValue);

        const validation = currentStep.validate
          ? currentStep.validate(cleanValue)
          : { valid: true, value: cleanValue };

        console.log("[VP] Validation result:", {
          field: currentStep.field,
          raw: text,
          cleaned: cleanValue,
          valid: validation.valid,
          stored: validation.value ?? cleanValue,
          error: validation.error,
        });

        if (!validation.valid) {
          console.log("[VP] Validation failed, repeating question");
          console.log("[VP] TTS speaking:", validation.error);
          await speak(validation.error);
          if (isMountedRef.current && autoRestartEnabledRef.current) {
            console.log("[VP] Mic started");
            startListeningRef.current?.();
          }
          return;
        }

        const storedValue = validation.value ?? cleanValue;
        console.log("[VP] After validation:", storedValue);

        const newCollected = { ...collected, [currentStep.field]: storedValue };
        console.log("[VP] Collected so far:", newCollected);
        if (currentStep.field === "recipient_name") {
          console.log("[VP] Recipient name collected:", storedValue);
        }
        const nextIndex = stepIndex + 1;

        if (nextIndex < flow.length) {
          // More questions to ask
          const updated = { type, stepIndex: nextIndex, collected: newCollected };
          setConvFlow(updated);
          convFlowRef.current = updated;

          const confirmText = currentStep.confirm(storedValue);
          const nextPrompt = `${confirmText} ${flow[nextIndex].question}`;
          console.log("[VP] TTS speaking:", nextPrompt);
          await speak(nextPrompt);
        } else {
          // All fields collected, read back the full summary
          convFlowRef.current = null;
          setConvFlow(null);

          if (type === "transfer") {
            setTransferDetails(newCollected);
            transferDetailsRef.current = newCollected;
            console.log("[VP] ── TRANSFER COMPLETE ───────");
            console.log("[VP] Full transfer details:", newCollected);
            const amountLabel = formatAmount(newCollected.amount);
            const totalLabel = formatAmount((Number(newCollected.amount) || 0) + 10);
            const summary = `You are sending ${amountLabel} to ${newCollected.recipient_name} at ${newCollected.bank}. Fee is ₦10. Total debit is ${totalLabel}. Say confirm to proceed or cancel to go back.`;
            console.log("[VP] TTS speaking:", summary);
            await speak(summary);
          } else {
            setDataDetails(newCollected);
            dataDetailsRef.current = newCollected;
            console.log("[VP] ── TRANSFER COMPLETE ───────");
            console.log("[VP] Details:", JSON.stringify(newCollected));
            const amountLabel = formatAmount(newCollected.amount);
            const summary = `To confirm: buying ${amountLabel} ${newCollected.network} for ${newCollected.phone}. Say confirm to proceed or cancel to go back.`;
            console.log("[VP] TTS speaking:", summary);
            await speak(summary);
          }
        }

        if (isMountedRef.current && autoRestartEnabledRef.current) {
          console.log("[VP] Mic started");
          startListeningRef.current?.();
        }
        return; // skip intent parsing while a conversation is active
      }

      console.log("[VP] ── INTENT ──────────────────");
      console.log("[VP] Raw transcript:", text);
      const intent = parseIntent(text);
      console.log("[VP] Parsed intent:", intent);
      console.log("[VP] Active conversation:", !!convFlowRef.current);
      handleIntent(intent).then(() => {
        // speak() only resolves once its audio has finished playing, so
        // starting the mic right here (no artificial delay) can't pick up
        // the tail of the TTS feedback.
        if (isMountedRef.current && autoRestartEnabledRef.current) {
          console.log("[VP] Mic started");
          startListeningRef.current?.();
        }
      });
    },
  });

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleStart = async () => {
    setStarted(true);
    // Browsers block autoplaying audio (and getUserMedia is tied to the same
    // gesture requirement) until a real user interaction happens, so both the
    // welcome speech and the mic can only be kicked off from this click handler.
    const welcome =
      "Welcome back Amara. You can say: send money, buy airtime, buy data, pay bills, check balance, check history, or open settings.";
    console.log("[VP] TTS speaking:", welcome);
    await speak(welcome);
    if (isMountedRef.current) {
      console.log("[VP] Mic started");
      startListening();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      autoRestartEnabledRef.current = false;
      console.log("[VP] Mic stopped, reason: manual");
      stopListening();
    } else {
      autoRestartEnabledRef.current = true;
      console.log("[VP] Mic started");
      startListening();
      speak("Listening for your command.");
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "transfer":
        return <Transfer navigate={navigate} details={transferDetails} />;
      case "airtime":
        return <Airtime navigate={navigate} details={dataDetails} />;
      case "data":
        return <DataAirtime navigate={navigate} details={dataDetails} />;
      case "bills":
        return <Bills navigate={navigate} />;
      case "history":
        return <History navigate={navigate} />;
      case "settings":
        return <Settings navigate={navigate} />;
      case "home":
      default:
        return (
          <Dashboard
            navigate={navigate}
            revealBalance={revealBalance}
            onMore={() => setShowMoreSheet(true)}
          />
        );
    }
  };

  if (!started) {
    return <SplashScreen onStart={handleStart} />;
  }

  return (
    <div className="app">
      <AppHeader />
      <main className="app-content">{renderScreen()}</main>

      <TranscriptBar isListening={isListening} transcript={transcript} error={error} />

      <MicButton isListening={isListening} onToggle={toggleListening} />

      {showMoreSheet && (
        <div className="sheet-backdrop" onClick={() => setShowMoreSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-title">More</p>
            <div className="sheet-list">
              {[
                { key: "bills", label: "Pay Bills" },
                { key: "settings", label: "Settings" },
                { key: "history", label: "Transaction History" },
              ].map((item) => (
                <button
                  key={item.key}
                  className="sheet-list-item"
                  onClick={() => {
                    setShowMoreSheet(false);
                    navigate(item.key);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
