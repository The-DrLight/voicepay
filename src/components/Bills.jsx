import { useState } from "react";
import { BILL_CATEGORIES, DISCOS } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const MOCK_CUSTOMER_NAME = "Amara Okafor";

export default function Bills({ navigate }) {
  const [category, setCategory] = useState(null);
  const [disco, setDisco] = useState(DISCOS[0]);
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleBack = () => {
    console.log("[VP] Navigating to: home");
    if (category) {
      setCategory(null);
      setVerifiedName("");
      return;
    }
    speak("Going back to dashboard.");
    navigate("home");
  };

  const handleSelectCategory = (cat) => {
    console.log("[VP] Navigating to: bills/" + cat.key);
    setCategory(cat);
  };

  const handleVerifyMeter = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerifiedName(MOCK_CUSTOMER_NAME);
      console.log("[VP] Transfer details collected:", { type: "bills", disco, meterNumber, customer: MOCK_CUSTOMER_NAME });
    }, 900);
  };

  const handlePay = () => {
    speak(`Paying ₦${amount || 0} ${disco} electricity bill.`);
    navigate("home");
  };

  if (!category) {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="back-button" onClick={handleBack} aria-label="Back">
            ←
          </button>
          <h1 className="screen-title">Pay Bills</h1>
        </div>

        <div className="category-grid">
          {BILL_CATEGORIES.map((cat) => (
            <button key={cat.key} className="category-card" onClick={() => handleSelectCategory(cat)}>
              <span className="category-icon-circle" aria-hidden="true">
                {cat.icon}
              </span>
              <span className="category-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (category.key !== "electricity") {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="back-button" onClick={handleBack} aria-label="Back">
            ←
          </button>
          <h1 className="screen-title">{category.label}</h1>
        </div>
        <div className="card">
          <p className="voice-hint">{category.label} payments are coming soon.</p>
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
        <h1 className="screen-title">Electricity</h1>
      </div>

      <div className="card form-card">
        <label className="field-label">Disco</label>
        <div className="quick-amounts">
          {DISCOS.map((d) => (
            <button
              key={d}
              type="button"
              className={`quick-amount-btn ${disco === d ? "active" : ""}`}
              onClick={() => {
                setDisco(d);
                setVerifiedName("");
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="meter-number">
          Meter Number
        </label>
        <input
          id="meter-number"
          className="text-input"
          type="tel"
          inputMode="numeric"
          placeholder="e.g. 04123456789"
          value={meterNumber}
          onChange={(e) => {
            setMeterNumber(e.target.value.replace(/\D/g, ""));
            setVerifiedName("");
          }}
        />

        {verifying && (
          <div className="readonly-field">
            <span>Verifying meter…</span>
            <span className="spinner" aria-hidden="true" />
          </div>
        )}

        {verifiedName && !verifying && (
          <div className="readonly-field">
            <span>{verifiedName}</span>
            <span style={{ color: "var(--success)" }} aria-hidden="true">
              ✓
            </span>
          </div>
        )}

        {!verifiedName && (
          <button className="btn btn-secondary" disabled={!meterNumber} onClick={handleVerifyMeter}>
            Verify Meter
          </button>
        )}

        <label className="field-label" htmlFor="bill-amount">
          Amount
        </label>
        <input
          id="bill-amount"
          className="text-input"
          type="tel"
          inputMode="numeric"
          placeholder="e.g. 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <button className="btn btn-primary" disabled={!verifiedName || !amount} onClick={handlePay}>
        Pay
      </button>
    </div>
  );
}
