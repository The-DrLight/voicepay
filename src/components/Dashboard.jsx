import { useState } from "react";
import { USER, TRANSACTIONS } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const formatBalance = (amount) =>
  `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

const formatAmount = (type, amount) =>
  `${type === "credit" ? "+" : "-"}₦${amount.toLocaleString("en-NG")}`;

const firstName = USER.name.split(" ")[0];

const QUICK_ACTIONS = [
  { label: "Transfer", screen: "transfer", icon: "💸" },
  { label: "Airtime", screen: "airtime", icon: "📱" },
  { label: "Data", screen: "data", icon: "🌐" },
  { label: "Bills", screen: "bills", icon: "⚡" },
  { label: "More", screen: "more", icon: "➕" },
];

export default function Dashboard({ navigate, revealBalance, onMore }) {
  const [balanceVisible, setBalanceVisible] = useState(revealBalance || false);

  const toggleBalance = () => {
    const next = !balanceVisible;
    setBalanceVisible(next);
    speak(next ? "Showing your balance." : "Balance hidden.");
  };

  const handleQuickAction = (action) => {
    console.log("[VP] Navigating to:", action.screen);
    if (action.screen === "more") {
      onMore?.();
      return;
    }
    speak(`Opening ${action.label}.`);
    navigate(action.screen);
  };

  const handleSeeAll = () => {
    console.log("[VP] Navigating to: history");
    speak("Here are your recent transactions.");
    navigate("history");
  };

  const recent = TRANSACTIONS.slice(0, 3);

  return (
    <div className="screen">
      <div>
        <p className="greeting-sub">Good evening, {firstName}</p>
        <p className="greeting-date">Tuesday, 15 September 2026</p>
      </div>

      <div className="card balance-card">
        <div className="balance-top-row">
          <p className="balance-label">Total Balance</p>
          <button
            className="balance-eye-btn"
            onClick={toggleBalance}
            aria-label={balanceVisible ? "Hide balance" : "Show balance"}
          >
            {balanceVisible ? "🙈" : "👁️"}
          </button>
        </div>
        <p className="balance-amount">
          {balanceVisible ? formatBalance(USER.balance) : "₦••••••••"}
        </p>
        <p className="account-number">
          {USER.accountNumber} | {USER.bank}
        </p>
        <div className="balance-stats-row">
          <span className="balance-stat income">↑ Income ₦{USER.income.toLocaleString("en-NG")}</span>
          <span className="balance-stat expense">↓ Expenses ₦{USER.expenses.toLocaleString("en-NG")}</span>
        </div>
      </div>

      <div className="quick-actions-scroll">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.screen}
            className="quick-action-item"
            onClick={() => handleQuickAction(action)}
          >
            <span className="quick-action-circle" aria-hidden="true">
              {action.icon}
            </span>
            <p className="quick-action-label">{action.label}</p>
          </button>
        ))}
      </div>

      <div className="section-header-row">
        <p className="section-header-title">Recent Transactions</p>
        <button className="see-all-link" onClick={handleSeeAll}>
          See all
        </button>
      </div>

      <div className="transaction-list">
        {recent.map((tx) => (
          <div key={tx.id} className="card transaction-item">
            <span className={`tx-icon-circle ${tx.type}`} aria-hidden="true">
              {tx.type === "credit" ? "💰" : "💸"}
            </span>
            <div className="transaction-info">
              <p className="transaction-label">{tx.label}</p>
              <p className="transaction-date">{tx.date}</p>
            </div>
            <div className="transaction-amount-col">
              <p className={`transaction-amount ${tx.type}`}>{formatAmount(tx.type, tx.amount)}</p>
              <p className="tx-status">Success</p>
            </div>
          </div>
        ))}
      </div>

      <p className="voice-hint">Say a command or tap a card</p>
    </div>
  );
}
