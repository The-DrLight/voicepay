import { useEffect, useState } from "react";
import { speak } from "../utils/ttsService";

const NETWORKS = [
  { name: "MTN", color: "#FFC300" },
  { name: "Airtel", color: "#FF0000" },
  { name: "Glo", color: "#008751" },
  { name: "9mobile", color: "#006600" },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export default function DataAirtime({ navigate, details }) {
  const [tab, setTab] = useState("data");
  const [network, setNetwork] = useState(NETWORKS[0].name);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!details) return;
    if (details.network) setNetwork(details.network);
    if (details.phone) setPhone(details.phone);
    if (details.amount != null) setAmount(String(details.amount));
  }, [details]);

  const handleConfirm = () => {
    const kind = tab === "data" ? "data" : "airtime";
    speak(`Buying ₦${amount || 0} ${network} ${kind} for ${phone || "your number"}.`);
    navigate("home");
  };

  const handleBack = () => {
    speak("Going back to dashboard.");
    navigate("home");
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-button" onClick={handleBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Data & Airtime</h1>
      </div>

      <div className="tab-row">
        <button
          className={`tab-item ${tab === "data" ? "active" : ""}`}
          onClick={() => setTab("data")}
        >
          Data
        </button>
        <button
          className={`tab-item ${tab === "airtime" ? "active" : ""}`}
          onClick={() => setTab("airtime")}
        >
          Airtime
        </button>
      </div>

      <div className="network-grid">
        {NETWORKS.map((n) => (
          <button
            key={n.name}
            className={`network-card ${network === n.name ? "selected" : ""}`}
            onClick={() => setNetwork(n.name)}
          >
            <span className="network-circle" style={{ background: n.color }}>
              {n.name}
            </span>
            <span className="network-name">{n.name}</span>
          </button>
        ))}
      </div>

      <div className="card form-card">
        <label className="field-label" htmlFor="phone">
          Phone Number
        </label>
        <input
          id="phone"
          className="text-input"
          type="tel"
          placeholder="e.g. 08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <label className="field-label" htmlFor="data-amount">
          Amount
        </label>
        <input
          id="data-amount"
          className="text-input"
          type="number"
          placeholder="e.g. 1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="quick-amounts">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              className={`quick-amount-btn ${String(amount) === String(value) ? "active" : ""}`}
              onClick={() => setAmount(String(value))}
            >
              ₦{value}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleConfirm}>
        Confirm
      </button>
    </div>
  );
}
