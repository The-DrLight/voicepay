import { useEffect, useState } from "react";
import { NIGERIAN_BANKS, USER } from "../utils/mockData";
import { speak } from "../utils/ttsService";

const QUICK_AMOUNTS = [1000, 5000, 10000, 20000, 50000];
const FEE = 10;
const MOCK_ACCOUNT_NAME = "Daniel Olorunda";

const initials = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Transfer({ navigate, details }) {
  const [step, setStep] = useState(1);
  const [bank, setBank] = useState("");
  const [showBankSheet, setShowBankSheet] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [pinFilled, setPinFilled] = useState(0);
  const [success, setSuccess] = useState(false);
  const [ref, setRef] = useState("");

  useEffect(() => {
    if (!details) return;
    if (details.bank) {
      const match = NIGERIAN_BANKS.find((b) => b.toLowerCase().includes(String(details.bank).toLowerCase()));
      setBank(match || details.bank);
    }
    if (details.account_number) setAccountNumber(String(details.account_number).replace(/\D/g, ""));
    if (details.recipient_name) setAccountName(details.recipient_name);
    if (details.amount != null) setAmount(String(details.amount).replace(/\D/g, ""));
    if (details.narration && !/skip/i.test(details.narration)) setNarration(details.narration);
  }, [details]);

  useEffect(() => {
    if (details?.recipient_name) return;
    if (accountNumber.length === 10) {
      setLookingUp(true);
      setAccountName("");
      const t = setTimeout(() => {
        setLookingUp(false);
        setAccountName(MOCK_ACCOUNT_NAME);
        console.log("[VP] Transfer details collected:", { bank, accountNumber, accountName: MOCK_ACCOUNT_NAME });
      }, 900);
      return () => clearTimeout(t);
    } else {
      setAccountName("");
    }
  }, [accountNumber, bank, details]);

  const handleBack = () => {
    console.log("[VP] Navigating to: home");
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    speak("Going back to dashboard.");
    navigate("home");
  };

  const goStep = (n) => {
    console.log("[VP] Conversation step: transfer_step ->", n);
    setStep(n);
  };

  const filteredBanks = NIGERIAN_BANKS.filter((b) =>
    b.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleConfirmTransfer = () => {
    setPinFilled(0);
    const t1 = setTimeout(() => setPinFilled(2), 250);
    const t2 = setTimeout(() => setPinFilled(4), 1000);
    const t3 = setTimeout(() => {
      const generatedRef = `VPY2026091501${Math.floor(100 + Math.random() * 900)}`;
      setRef(generatedRef);
      console.log("[VP] Transfer details collected:", {
        bank,
        accountNumber,
        accountName,
        amount,
        narration,
        ref: generatedRef,
      });
      setSuccess(true);
      speak(`Transfer successful. ${amount} naira sent to ${accountName}.`);
    }, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const total = (Number(amount) || 0) + FEE;

  if (success) {
    return (
      <div className="screen">
        <div className="success-screen">
          <span className="success-check" aria-hidden="true">
            ✓
          </span>
          <p className="success-title">Transfer Successful!</p>
          <p className="success-amount">₦{Number(amount || 0).toLocaleString("en-NG")}</p>
          <p className="success-sub">To: {accountName}</p>
          <p className="success-ref">Transaction ref: {ref}</p>

          <div className="success-actions">
            <button className="btn btn-secondary" onClick={() => speak("Sharing receipt.")}>
              Share Receipt
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                console.log("[VP] Navigating to: home");
                navigate("home");
              }}
            >
              Go to Dashboard
            </button>
          </div>
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
        <h1 className="screen-title">Send Money</h1>
        <button className="screen-header-right app-icon-btn" aria-label="Contacts">
          📇
        </button>
      </div>

      <div className="step-dots">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`step-dot ${step === n ? "active" : step > n ? "done" : ""}`}
          />
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="card form-card">
            <label className="field-label">Select Bank</label>
            <button className="bank-picker-trigger" onClick={() => setShowBankSheet(true)}>
              <span className={bank ? "" : "placeholder"}>{bank || "Choose a bank"}</span>
              <span aria-hidden="true">▾</span>
            </button>

            <label className="field-label" htmlFor="account-number">
              Account Number
            </label>
            <input
              id="account-number"
              className="text-input text-input-lg"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="0000000000"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />

            {lookingUp && (
              <div className="readonly-field">
                <span>Looking up account…</span>
                <span className="spinner" aria-hidden="true" />
              </div>
            )}

            {accountName && !lookingUp && (
              <div className="readonly-field">
                <span>{accountName}</span>
                <span style={{ color: "var(--success)" }} aria-hidden="true">
                  ✓
                </span>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            disabled={!bank || !accountName}
            onClick={() => goStep(2)}
          >
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="card recipient-summary">
            <span className="recipient-avatar" aria-hidden="true">
              {initials(accountName)}
            </span>
            <div>
              <p className="recipient-name">{accountName}</p>
              <p className="recipient-bank">{bank}</p>
            </div>
          </div>

          <div className="card form-card">
            <label className="field-label" htmlFor="amount">
              Amount (₦)
            </label>
            <input
              id="amount"
              className="text-input text-input-lg"
              type="tel"
              inputMode="numeric"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />

            <div className="quick-amounts">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`quick-amount-btn ${String(amount) === String(v) ? "active" : ""}`}
                  onClick={() => setAmount(String(v))}
                >
                  ₦{v.toLocaleString("en-NG")}
                </button>
              ))}
            </div>

            <label className="field-label" htmlFor="narration">
              Narration
            </label>
            <input
              id="narration"
              className="text-input"
              type="text"
              placeholder="e.g. For food"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />

            <p className="available-balance">Available: ₦{USER.balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
          </div>

          <button className="btn btn-primary" disabled={!amount} onClick={() => goStep(3)}>
            Continue
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="screen-title" style={{ textAlign: "center" }}>
            Confirm Transfer
          </h2>

          <div className="card summary-list">
            <div className="summary-row">
              <span className="k">Recipient</span>
              <span className="v">{accountName}</span>
            </div>
            <div className="summary-row">
              <span className="k">Bank</span>
              <span className="v">{bank}</span>
            </div>
            <div className="summary-row">
              <span className="k">Account</span>
              <span className="v">{accountNumber}</span>
            </div>
            <div className="summary-row">
              <span className="k">Amount</span>
              <span className="v">₦{Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-row">
              <span className="k">Narration</span>
              <span className="v">{narration || "—"}</span>
            </div>
            <div className="summary-row">
              <span className="k">Fee</span>
              <span className="v">₦{FEE.toFixed(2)}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total">
              <span className="k">Total Debit</span>
              <span className="v">₦{total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="pin-dots-row">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`pin-dot ${i < pinFilled ? "filled" : ""}`} />
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleConfirmTransfer}>
            Confirm Transfer
          </button>
        </>
      )}

      {showBankSheet && (
        <div className="sheet-backdrop" onClick={() => setShowBankSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-title">Select Bank</p>
            <input
              className="text-input"
              type="text"
              placeholder="Search banks"
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
            />
            <div className="sheet-list">
              {filteredBanks.map((b) => (
                <button
                  key={b}
                  className="sheet-list-item"
                  onClick={() => {
                    setBank(b);
                    setShowBankSheet(false);
                    setBankSearch("");
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
