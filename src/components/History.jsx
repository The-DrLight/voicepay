import { useState } from "react";
import { TRANSACTIONS } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "debit", label: "Sent" },
  { key: "credit", label: "Received" },
  { key: "bills", label: "Bills" },
];

const KIND_ICON = {
  transfer: "🏦",
  airtime: "📱",
  bills: "⚡",
};

const GROUP_ORDER = ["Today", "Yesterday", "Earlier"];

const formatAmount = (type, amount) =>
  `${type === "credit" ? "+" : "-"}₦${amount.toLocaleString("en-NG")}`;

export default function History({ navigate }) {
  const [filter, setFilter] = useState("all");
  const [monthOffset, setMonthOffset] = useState(0);

  const handleBack = () => {
    console.log("[VP] Navigating to: home");
    speak("Going back to dashboard.");
    navigate("home");
  };

  const transactions = TRANSACTIONS.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "bills") return tx.kind === "bills";
    return tx.type === filter;
  });

  const income = TRANSACTIONS.filter((tx) => tx.type === "credit").reduce((s, t) => s + t.amount, 0);
  const expenses = TRANSACTIONS.filter((tx) => tx.type === "debit").reduce((s, t) => s + t.amount, 0);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const baseMonth = 8; // September (0-indexed)
  const monthIndex = (((baseMonth + monthOffset) % 12) + 12) % 12;

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-button" onClick={handleBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Transactions</h1>
      </div>

      <div className="history-summary-row">
        <span className="history-summary-pill income">Income ₦{income.toLocaleString("en-NG")}</span>
        <span className="history-summary-pill expense">Expenses ₦{expenses.toLocaleString("en-NG")}</span>
      </div>

      <div className="tab-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`tab-item ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="month-selector">
        <button className="month-nav-btn" onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month">
          ‹
        </button>
        <span className="month-label">{monthNames[monthIndex]} 2026</span>
        <button className="month-nav-btn" onClick={() => setMonthOffset((m) => m + 1)} aria-label="Next month">
          ›
        </button>
      </div>

      {GROUP_ORDER.map((group) => {
        const groupTx = transactions.filter((tx) => tx.group === group);
        if (groupTx.length === 0) return null;
        return (
          <div key={group} className="transaction-list">
            <p className="date-group-label">{group}</p>
            {groupTx.map((tx) => (
              <div key={tx.id} className="card transaction-item">
                <span className={`tx-icon-circle ${tx.type}`} aria-hidden="true">
                  {KIND_ICON[tx.kind] || "💰"}
                </span>

                <div className="transaction-info">
                  <p className="transaction-label">{tx.label}</p>
                  <p className="transaction-date">{tx.date}</p>
                  <span className="tx-lang-pill">{tx.language}</span>
                </div>

                <div className="transaction-amount-col">
                  <p className={`transaction-amount ${tx.type}`}>{formatAmount(tx.type, tx.amount)}</p>
                  <p className="tx-status">Success</p>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
