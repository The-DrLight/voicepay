import { USER } from "../utils/mockData";

export default function AppHeader({ onNavigate }) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <button className="app-icon-btn" aria-label="Menu">
          ☰
        </button>
      </div>

      <button
        className="app-logo app-logo-btn"
        onClick={() => onNavigate?.("home")}
        aria-label="Go to dashboard"
      >
        VoicePay
      </button>

      <div className="app-header-right">
        <button className="app-icon-btn" aria-label="Notifications">
          🔔
          <span className="notif-dot" aria-hidden="true" />
        </button>
        <span className="avatar-badge" aria-hidden="true">
          {USER.initials}
        </span>
      </div>
    </header>
  );
}
