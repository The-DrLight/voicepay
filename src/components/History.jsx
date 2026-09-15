import { useState } from "react";
import { TRANSACTIONS } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "debit", label: "Sent" },
  { key: "credit", label: "Received" },
];

const formatAmount = (type, amount) =>
  `${type === "credit" ? "+" : "-"}₦${amount.toLocaleString("en-NG")}`;

export default function History({ navigate }) {
  const [filter, setFilter] = useState("all");

  const handleBack = () => {
    speak("Going back to dashboard.");
    navigate("home");
  };

  const transactions = TRANSACTIONS.filter((tx) => filter === "all" || tx.type === filter);

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-button" onClick={handleBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Transactions</h1>
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

      <div className="transaction-list">
        {transactions.map((tx) => (
          <div key={tx.id} className="card transaction-item">
            <span className={`tx-icon-circle ${tx.type}`} aria-hidden="true">
              {tx.type === "credit" ? "💰" : "💸"}
            </span>

            <div className="transaction-info">
              <p className="transaction-label">{tx.label}</p>
              <p className="transaction-date">{tx.date}</p>
              <span className="tx-lang-pill">{tx.language}</span>
            </div>

            <div className="transaction-amount-col">
              <p className={`transaction-amount ${tx.type}`}>{formatAmount(tx.type, tx.amount)}</p>
              <p className="tx-status">Completed</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
