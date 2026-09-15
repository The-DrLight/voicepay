import { useEffect, useState } from "react";
import { speak } from "../utils/ttsService";

const CONTACTS = [
  { name: "Tunde", color: "#7C6FE0" },
  { name: "Ngozi", color: "#FF8A8A" },
  { name: "Emeka", color: "#6EE7B7" },
  { name: "Fatima", color: "#FFD666" },
];

const initials = (name) => name.slice(0, 2).toUpperCase();

export default function Transfer({ navigate, details }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!details) return;
    if (details.recipient) setRecipient(details.recipient);
    if (details.amount != null) setAmount(String(details.amount));
  }, [details]);

  const handleConfirm = () => {
    speak(`Sending ₦${amount || 0} to ${recipient || "recipient"}.`);
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
        <h1 className="screen-title">Send Money</h1>
      </div>

      <div className="avatar-row">
        {CONTACTS.map((contact) => (
          <button
            key={contact.name}
            className="avatar-item"
            onClick={() => setRecipient(contact.name)}
          >
            <span className="avatar-circle" style={{ background: contact.color }}>
              {initials(contact.name)}
            </span>
            <span className="avatar-name">{contact.name}</span>
          </button>
        ))}
      </div>

      <div className="card form-card">
        <label className="field-label" htmlFor="recipient">
          Recipient
        </label>
        <input
          id="recipient"
          className="text-input"
          type="text"
          placeholder="e.g. Emeka Johnson"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <label className="field-label" htmlFor="amount">
          Amount (₦)
        </label>
        <input
          id="amount"
          className="text-input"
          type="number"
          placeholder="e.g. 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label className="field-label" htmlFor="note">
          Add a note
        </label>
        <input
          id="note"
          className="text-input"
          type="text"
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button className="btn btn-primary" onClick={handleConfirm}>
        Confirm Transfer
      </button>

      <p className="voice-hint">Say the amount to fill it in</p>
    </div>
  );
}
