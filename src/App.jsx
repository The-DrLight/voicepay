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
import { processCommand } from "./utils/voiceAgent";
import { speak } from "./utils/ttsService";

const SCREEN_NAMES = {
  home: "Dashboard",
  transfer: "Transfer",
  airtime: "Buy Airtime",
  data: "Buy Data",
  bills: "Pay Bills",
  history: "History",
  settings: "Settings",
};

function formatAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return `₦${num.toLocaleString("en-NG")}`;
}

function getAvailableActions(screen) {
  const actions = {
    home: ["send money", "buy airtime", "buy data", "pay bills", "check history", "check balance", "open settings"],
    transfer: ["say bank number", "say account number", "say recipient name", "say amount", "say narration", "say confirm or cancel"],
    airtime: ["say network number", "say phone number", "say amount", "say confirm or cancel"],
    data: ["say network number", "say phone number", "say confirm or cancel"],
    bills: ["say bill type", "say meter number", "say amount", "say confirm or cancel"],
  };
  return actions[screen] || actions.home;
}

function getContextualHelp(screen, step) {
  if (screen === "home") {
    return "You can say: send money, buy airtime, buy data, pay bills, or check history.";
  }
  if (step === "bank") {
    return "Please say a number for your bank. 1 for GTBank, 6 for Opay, 7 for PalmPay.";
  }
  if (step === "account_number") {
    return "Please say your 10-digit account number.";
  }
  if (step === "amount") {
    return "Please say an amount, like ten thousand naira.";
  }
  return "Say go back to return to the dashboard.";
}

const TRANSFER_STEPS = ["bank", "account_number", "recipient_name", "amount", "narration"];

function getNextPrompt(currentStep, field, value, collected, screen) {
  if (screen === "transfer" && TRANSFER_STEPS.includes(field)) {
    const currentIndex = TRANSFER_STEPS.indexOf(field);

    if (currentIndex < TRANSFER_STEPS.length - 1) {
      const next = TRANSFER_STEPS[currentIndex + 1];
      const prompts = {
        account_number: `Got it, ${value}. What is the 10-digit account number?`,
        recipient_name: "Account number saved. What is the recipient name?",
        amount: `Got it, sending to ${value}. How much do you want to send?`,
        narration: `Amount is ${formatAmount(value)}. Any narration? Say skip to continue.`,
      };
      return { done: false, nextStep: next, prompt: prompts[next] };
    }
    return { done: true };
  }

  if (currentStep === "network_airtime") {
    return {
      done: false,
      nextStep: "phone_airtime",
      prompt: `${value} selected. What phone number? Say use my number for your registered number.`,
    };
  }
  if (currentStep === "phone_airtime") {
    return { done: false, nextStep: "amount_airtime", prompt: "Phone number saved. How much airtime?" };
  }
  if (currentStep === "amount_airtime") {
    return { done: true };
  }

  if (currentStep === "network_data") {
    return { done: false, nextStep: "phone_data", prompt: `${value} selected. What phone number?` };
  }
  if (currentStep === "phone_data") {
    return { done: true };
  }

  return { done: true };
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("home");
  const [currentStep, setCurrentStep] = useState(null);
  const [collectedData, setCollectedData] = useState({});
  const [revealBalance, setRevealBalance] = useState(false);
  const [transferDetails, setTransferDetails] = useState({});
  const [dataDetails, setDataDetails] = useState({});
  const [showMoreSheet, setShowMoreSheet] = useState(false);

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
  const currentStepRef = useRef(currentStep);
  const collectedDataRef = useRef(collectedData);
  const transferDetailsRef = useRef(transferDetails);
  const dataDetailsRef = useRef(dataDetails);

  useEffect(() => {
    console.log("[VP] App mounted");
  }, []);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    collectedDataRef.current = collectedData;
  }, [collectedData]);

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

  const handleNavigate = (screen) => {
    console.log("[VP] Manual navigation to:", screen);
    navigate(screen, "tap");
    setCurrentStep(null);
    setCollectedData({});
    currentStepRef.current = null;
    collectedDataRef.current = {};
  };

  const restartMic = () => {
    if (isMountedRef.current && autoRestartEnabledRef.current) {
      console.log("[VP] Mic started");
      startListeningRef.current?.();
    }
  };

  const resetConversation = () => {
    setCurrentStep(null);
    setCollectedData({});
    currentStepRef.current = null;
    collectedDataRef.current = {};
  };

  const handleTransactionComplete = async (screen, data) => {
    if (screen === "transfer") {
      const amt = parseFloat(data.amount) || 0;
      const total = amt + 10;
      const msg =
        `To confirm: sending ${formatAmount(amt)} to ${data.recipient_name} at ${data.bank}. ` +
        `Account number ${data.account_number}. Total debit including fees is ${formatAmount(total)}. ` +
        "Say confirm to proceed or cancel to go back.";
      setCurrentStep("awaiting_confirm");
      currentStepRef.current = "awaiting_confirm";
      console.log("[VP] TTS speaking:", msg);
      await speak(msg);
    } else if (screen === "airtime") {
      const msg = `Buying ${formatAmount(data.amount)} ${data.network} airtime for ${data.phone}. Say confirm to proceed.`;
      setCurrentStep("awaiting_confirm");
      currentStepRef.current = "awaiting_confirm";
      console.log("[VP] TTS speaking:", msg);
      await speak(msg);
    } else if (screen === "data") {
      const msg = `Buying ${data.network} data for ${data.phone}. Say confirm to proceed.`;
      setCurrentStep("awaiting_confirm");
      currentStepRef.current = "awaiting_confirm";
      console.log("[VP] TTS speaking:", msg);
      await speak(msg);
    }
  };

  const handleConfirm = async (screen, data) => {
    if (screen === "transfer") {
      const amt = parseFloat(data.amount) || 0;
      setTransferDetails(data);
      transferDetailsRef.current = data;
      navigate("home");
      resetConversation();
      setTransferDetails({});
      transferDetailsRef.current = {};
      console.log("[VP] Transfer details collected:", data);
      await speak(`Transfer of ${formatAmount(amt)} to ${data.recipient_name} was successful. Returning to dashboard.`);
    } else if (screen === "airtime" || screen === "data") {
      setDataDetails(data);
      dataDetailsRef.current = data;
      navigate("home");
      resetConversation();
      setDataDetails({});
      dataDetailsRef.current = {};
      console.log("[VP] Purchase details collected:", data);
      await speak("Purchase confirmed. Returning to dashboard.");
    }
  };

  const handleDecision = async (decision, textForLog) => {
    console.log("[VP] ── AGENT DECISION ──────────");
    console.log("[VP] Action:", decision.action);
    console.log("[VP] Full decision:", JSON.stringify(decision));

    switch (decision.action) {
      case "NAVIGATE": {
        console.log("[VP] Navigating to:", decision.screen);
        navigate(decision.screen, textForLog);
        resetConversation();
        setTransferDetails({});
        setDataDetails({});
        transferDetailsRef.current = {};
        dataDetailsRef.current = {};

        if (decision.screen === "transfer") {
          await speak(
            "Opening transfer. Which bank? Say a number. 1 for GTBank, 2 for Access Bank, 3 for Zenith, 4 for First Bank, 5 for UBA, 6 for Opay, 7 for PalmPay, 8 for Moniepoint, 9 for Kuda."
          );
          setCurrentStep("bank");
          currentStepRef.current = "bank";
        } else if (decision.screen === "airtime") {
          await speak("Buy airtime. Which network? 1 for MTN, 2 for Airtel, 3 for Glo, 4 for 9mobile.");
          setCurrentStep("network_airtime");
          currentStepRef.current = "network_airtime";
        } else if (decision.screen === "data") {
          await speak("Buy data. Which network? 1 for MTN, 2 for Airtel, 3 for Glo, 4 for 9mobile.");
          setCurrentStep("network_data");
          currentStepRef.current = "network_data";
        } else if (decision.screen === "bills") {
          await speak("Pay bills. Say electricity, cable TV, water, or internet.");
        } else if (decision.screen === "history") {
          await speak("Here are your recent transactions.");
        } else if (decision.screen === "home") {
          await speak("Back to dashboard.");
        } else if (decision.screen === "settings") {
          await speak("Settings. Say voice language to change your language.");
        }
        break;
      }

      case "COLLECT_FIELD": {
        if (!decision.valid) {
          console.log("[VP] Field invalid:", decision.error);
          await speak(decision.error);
          break;
        }

        const newData = { ...collectedDataRef.current, [decision.field]: decision.value };
        setCollectedData(newData);
        collectedDataRef.current = newData;
        console.log("[VP] Field collected:", decision.field, "=", decision.value);
        console.log("[VP] All data so far:", JSON.stringify(newData));

        const nextPrompt = getNextPrompt(
          currentStepRef.current,
          decision.field,
          decision.value,
          newData,
          currentScreenRef.current
        );

        if (nextPrompt.done) {
          await handleTransactionComplete(currentScreenRef.current, newData);
        } else {
          setCurrentStep(nextPrompt.nextStep);
          currentStepRef.current = nextPrompt.nextStep;
          await speak(nextPrompt.prompt);
        }
        break;
      }

      case "CONFIRM":
        console.log("[VP] Confirmed transaction");
        await handleConfirm(currentScreenRef.current, collectedDataRef.current);
        break;

      case "CANCEL":
        console.log("[VP] Cancelled, going home");
        resetConversation();
        setTransferDetails({});
        setDataDetails({});
        transferDetailsRef.current = {};
        dataDetailsRef.current = {};
        navigate("home");
        await speak("Cancelled. Back to dashboard.");
        break;

      case "REVEAL_BALANCE":
        setRevealBalance(true);
        await speak("Your balance is two hundred and forty seven thousand, five hundred naira.");
        break;

      case "RESTART_MIC":
        // Explicit user request to wake the mic, so it fires even if a
        // manual stop had disabled auto-restart.
        autoRestartEnabledRef.current = true;
        await speak("I am listening.");
        break;

      case "UNKNOWN":
      default:
        console.log("[VP] Unknown intent, suggestion:", decision.suggestion);
        await speak("I did not understand that. " + getContextualHelp(currentScreenRef.current, currentStepRef.current));
        break;
    }
  };

  const { isListening, transcript, error, startListening, stopListening } = useVoiceCommand({
    onTranscript: async (text) => {
      console.log("[VP] ── TRANSCRIPT ──────────────");
      console.log("[VP] Text:", text);
      console.log("[VP] Screen:", currentScreenRef.current);
      console.log("[VP] Step:", currentStepRef.current);
      console.log("[VP] Collected:", JSON.stringify(collectedDataRef.current));

      const decision = await processCommand(text, {
        currentScreen: currentScreenRef.current,
        conversationStep: currentStepRef.current,
        collectedData: collectedDataRef.current,
        availableActions: getAvailableActions(currentScreenRef.current),
      });

      await handleDecision(decision, text);
      restartMic();
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
      <AppHeader onNavigate={handleNavigate} />
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
