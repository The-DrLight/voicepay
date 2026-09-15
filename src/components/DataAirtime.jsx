import { useEffect, useState } from "react";
import { NETWORKS, DATA_PLANS } from "../utils/mockData";
import { speak } from "../utils/ttsService";

export default function DataAirtime({ navigate, details }) {
  const [network, setNetwork] = useState(NETWORKS[0].name);
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!details) return;
    if (details.network) {
      const match = NETWORKS.find((n) => n.name.toLowerCase() === String(details.network).toLowerCase());
      if (match) setNetwork(match.name);
    }
    if (details.phone) setPhone(details.phone);
  }, [details]);

  useEffect(() => {
    setSelectedPlan(null);
  }, [network]);

  const handleBack = () => {
    console.log("[VP] Navigating to: home");
    speak("Going back to dashboard.");
    navigate("home");
  };

  const handleBuy = () => {
    console.log("[VP] Transfer details collected:", { type: "data", network, phone, plan: selectedPlan });
    setSuccess(true);
    speak(`Buying ${selectedPlan?.size} ${network} data for ${phone || "your number"}.`);
    setTimeout(() => navigate("home"), 1800);
  };

  const plans = DATA_PLANS[network] || [];

  if (success) {
    return (
      <div className="screen">
        <div className="success-screen">
          <span className="success-check" aria-hidden="true">
            ✓
          </span>
          <p className="success-title">Data Purchase Successful!</p>
          <p className="success-amount">{selectedPlan?.size}</p>
          <p className="success-sub">
            {network} data for {phone || "your number"}
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
        <h1 className="screen-title">Buy Data</h1>
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
        <input
          id="phone"
          className="text-input"
          type="tel"
          placeholder="e.g. 08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="plan-grid">
        {plans.map((plan) => (
          <button
            key={plan.size}
            className={`plan-card ${selectedPlan?.size === plan.size ? "selected" : ""}`}
            onClick={() => setSelectedPlan(plan)}
          >
            <div>
              <p className="plan-size">{plan.size}</p>
              <p className="plan-validity">{plan.validity}</p>
            </div>
            <span className="plan-price">₦{plan.price.toLocaleString("en-NG")}</span>
          </button>
        ))}
      </div>

      <button className="btn btn-primary" disabled={!selectedPlan || !phone} onClick={handleBuy}>
        Buy Data
      </button>
    </div>
  );
}
