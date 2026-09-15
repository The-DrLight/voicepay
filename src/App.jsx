import { useEffect, useRef, useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import Transfer from "./components/Transfer";
import DataAirtime from "./components/DataAirtime";
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

const SCREEN_NAMES = {
  home: "Dashboard",
  transfer: "Transfer",
  data: "Buy Data",
  history: "History",
  settings: "Settings",
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("home");
  const [revealBalance, setRevealBalance] = useState(false);
  const [transferDetails, setTransferDetails] = useState({});
  const [dataDetails, setDataDetails] = useState({});
  // null | { type: 'transfer' | 'data', stepIndex, collected }
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
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    transferDetailsRef.current = transferDetails;
  }, [transferDetails]);

  useEffect(() => {
    dataDetailsRef.current = dataDetails;
  }, [dataDetails]);

  const navigate = (screen) => {
    setCurrentScreen(screen);
  };

  const handleIntent = (intent) => {
    switch (intent) {
      case INTENTS.NAVIGATE_TRANSFER:
        navigate("transfer");
        return speak("Opening transfer.").then(async () => {
          const flow = getFlow("transfer");
          const newConv = { type: "transfer", stepIndex: 0, collected: {} };
          setConvFlow(newConv);
          convFlowRef.current = newConv;
          await speak(flow[0].question);
        });
      case INTENTS.NAVIGATE_DATA:
        navigate("data");
        return speak("Opening data and airtime.").then(async () => {
          const flow = getFlow("data");
          const newConv = { type: "data", stepIndex: 0, collected: {} };
          setConvFlow(newConv);
          convFlowRef.current = newConv;
          await speak(flow[0].question);
        });
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
          if (d.amount && d.recipient) {
            setTransferDetails({});
            transferDetailsRef.current = {};
            navigate("home");
            return speak("Transfer confirmed. Returning to dashboard.");
          }
        }
        if (currentScreenRef.current === "data") {
          const d = dataDetailsRef.current;
          if (d.amount && d.network && d.phone) {
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
        return Promise.resolve();
    }
  };

  const { isListening, transcript, error, startListening, stopListening } = useVoiceCommand({
    onTranscript: async (text) => {
      if (convFlowRef.current) {
        const { type, stepIndex, collected } = convFlowRef.current;
        const flow = getFlow(type);
        const currentStep = flow[stepIndex];

        const newCollected = { ...collected, [currentStep.field]: text };
        const nextIndex = stepIndex + 1;

        if (nextIndex < flow.length) {
          // More questions to ask
          const updated = { type, stepIndex: nextIndex, collected: newCollected };
          setConvFlow(updated);
          convFlowRef.current = updated;

          const confirmText = currentStep.confirm(text);
          await speak(`${confirmText} ${flow[nextIndex].question}`);
        } else {
          // All fields collected, read back the full summary
          convFlowRef.current = null;
          setConvFlow(null);

          if (type === "transfer") {
            setTransferDetails(newCollected);
            transferDetailsRef.current = newCollected;
            await speak(
              `To confirm: sending ${newCollected.amount} to ${newCollected.recipient}, ${newCollected.bank} account ${newCollected.account_number}. Say confirm to proceed or cancel to go back.`
            );
          } else {
            setDataDetails(newCollected);
            dataDetailsRef.current = newCollected;
            await speak(
              `To confirm: buying ${newCollected.amount} naira ${newCollected.network} for ${newCollected.phone}. Say confirm to proceed or cancel to go back.`
            );
          }
        }

        if (isMountedRef.current && autoRestartEnabledRef.current) {
          startListeningRef.current?.();
        }
        return; // skip intent parsing while a conversation is active
      }

      const intent = parseIntent(text);
      handleIntent(intent).then(() => {
        // speak() only resolves once its audio has finished playing, so
        // starting the mic right here (no artificial delay) can't pick up
        // the tail of the TTS feedback.
        if (isMountedRef.current && autoRestartEnabledRef.current) {
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
    await speak(
      "Welcome back Amara. You can say: send money, buy data, check balance, check history, or open settings."
    );
    if (isMountedRef.current) startListening();
  };

  const toggleListening = () => {
    if (isListening) {
      autoRestartEnabledRef.current = false;
      stopListening();
    } else {
      autoRestartEnabledRef.current = true;
      startListening();
      speak("Listening for your command.");
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "transfer":
        return <Transfer navigate={navigate} details={transferDetails} />;
      case "data":
        return <DataAirtime navigate={navigate} details={dataDetails} />;
      case "history":
        return <History navigate={navigate} />;
      case "settings":
        return <Settings navigate={navigate} />;
      case "home":
      default:
        return <Dashboard navigate={navigate} revealBalance={revealBalance} />;
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
    </div>
  );
}
