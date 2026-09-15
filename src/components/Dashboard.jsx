import { useState } from "react";
import { USER } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const formatBalance = (amount) =>
  `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

const firstName = USER.name.split(" ")[0];

export default function Dashboard({ navigate, revealBalance }) {
  const [balanceVisible, setBalanceVisible] = useState(revealBalance || false);

  const toggleBalance = () => {
    const next = !balanceVisible;
    setBalanceVisible(next);
    speak(next ? "Showing your balance." : "Balance hidden.");
  };

  const actions = [
    { label: "Send Money", screen: "transfer", icon: "💸" },
    { label: "Buy Data", screen: "data", icon: "📱" },
    { label: "History", screen: "history", icon: "📋" },
    { label: "Settings", screen: "settings", icon: "⚙️" },
  ];

  const handleNavigate = (screen, label) => {
    speak(`Opening ${label}.`);
    navigate(screen);
  };

  return (
    <div className="screen">
      <div>
        <p className="greeting-sub">Good morning, {firstName}</p>
        <p className="greeting-name">{USER.name}</p>
      </div>

      <div className="card balance-card">
        <p className="balance-label">Available Balance</p>
        <p className="balance-amount">
          {balanceVisible ? formatBalance(USER.balance) : "₦••••••••"}
        </p>
        <div className="balance-row">
          <p className="account-number">Account: 0123456789</p>
          <button
            className="balance-eye-btn"
            onClick={toggleBalance}
            aria-label={balanceVisible ? "Hide balance" : "Show balance"}
          >
            {balanceVisible ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      <div className="action-grid">
        {actions.map((action) => (
          <button
            key={action.screen}
            className="card action-card"
            onClick={() => handleNavigate(action.screen, action.label)}
          >
            <span className="action-icon" aria-hidden="true">
              {action.icon}
            </span>
            <p className="action-label">{action.label}</p>
          </button>
        ))}
      </div>

      <p className="voice-hint">Say a command or tap a card</p>
    </div>
  );
}
