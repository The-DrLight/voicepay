import { useEffect, useState } from "react";
import { NETWORKS, AIRTIME_AMOUNTS } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const MY_NUMBER = "0811 414 2082";

export default function Airtime({ navigate, details }) {
  const [network, setNetwork] = useState(NETWORKS[0].name);
  const [phone, setPhone] = useState(MY_NUMBER);
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!details) return;
    if (details.network) {
      const match = NETWORKS.find((n) => n.name.toLowerCase() === String(details.network).toLowerCase());
      if (match) setNetwork(match.name);
    }
    if (details.phone) setPhone(details.phone);
    if (details.amount != null) setAmount(String(details.amount).replace(/\D/g, ""));
  }, [details]);

  const handleBack = () => {
    console.log("[VP] Navigating to: home");
    speak("Going back to dashboard.");
    navigate("home");
  };

  const handleBuy = () => {
    console.log("[VP] Transfer details collected:", { type: "airtime", network, phone, amount });
    setSuccess(true);
    speak(`Buying ₦${amount || 0} ${network} airtime for ${phone}.`);
    setTimeout(() => navigate("home"), 1800);
  };

  if (success) {
    return (
      <div className="screen">
        <div className="success-screen">
          <span className="success-check" aria-hidden="true">
            ✓
          </span>
          <p className="success-title">Airtime Purchase Successful!</p>
          <p className="success-amount">₦{Number(amount || 0).toLocaleString("en-NG")}</p>
          <p className="success-sub">
            {network} airtime for {phone}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-button" onClick={handleBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Buy Airtime</h1>
      </div>

      <div className="network-grid">
        {NETWORKS.map((n) => (
          <button
            key={n.name}
            className={`network-card ${network === n.name ? "selected" : ""}`}
            onClick={() => setNetwork(n.name)}
          >
            {network === n.name && <span className="network-check">✓</span>}
            <span className="network-circle" style={{ background: n.color }}>
              {n.name}
            </span>
            <span className="network-name">{n.name}</span>
            <span className="network-hint">Tap to select</span>
          </button>
        ))}
      </div>

      <div className="card form-card">
        <label className="field-label" htmlFor="phone">
          Phone Number
        </label>
        <div className="input-with-action">
          <input
            id="phone"
            className="text-input"
            type="tel"
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="button" className="use-my-number-btn" onClick={() => setPhone(MY_NUMBER)}>
            Use my number
          </button>
        </div>

        <div className="quick-amounts">
          {AIRTIME_AMOUNTS.map((value) => (
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

        <label className="field-label" htmlFor="airtime-amount">
          Amount
        </label>
        <input
          id="airtime-amount"
          className="text-input"
          type="tel"
          inputMode="numeric"
          placeholder="e.g. 500"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <button className="btn btn-primary" disabled={!amount} onClick={handleBuy}>
        Buy Airtime
      </button>
    </div>
  );
}
