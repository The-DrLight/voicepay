import { useState } from "react";
import { USER } from "../utils/mockData";
import { speak, setTTSConfig } from "../utils/ttsService";

const LANGUAGES = [
  {
    key: "English",
    emoji: "🇬🇧",
    subtitle: "Standard English, Nigerian accent",
    config: { voice_language: "en", voice_accent: "yoruba" },
  },
  {
    key: "Yoruba-English",
    emoji: "🗣️",
    subtitle: "Switch between Yoruba and English",
    config: { voice_language: "yo", voice_accent: "yoruba" },
  },
  {
    key: "Pidgin-English",
    emoji: "🗣️",
    subtitle: "Nigerian Pidgin and English",
    config: { voice_language: "pcm", voice_accent: "nigerian pidgin" },
  },
];

const GENDERS = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
];

const MENU_ITEMS = [
  { key: "personal", icon: "👤", label: "Personal Information" },
  { key: "security", icon: "🔒", label: "Security & Privacy" },
  { key: "voice", icon: "🎤", label: "Voice Settings" },
  { key: "notifications", icon: "🔔", label: "Notifications" },
  { key: "cards", icon: "💳", label: "Cards & Accounts" },
  { key: "help", icon: "❓", label: "Help & Support" },
  { key: "signout", icon: "🚪", label: "Sign Out" },
];

export default function Settings({ navigate }) {
  const [language, setLanguage] = useState(LANGUAGES[0].key);
  const [gender, setGender] = useState("female");
  const [voiceExpanded, setVoiceExpanded] = useState(false);

  const handleLanguageSelect = (lang) => {
    setLanguage(lang.key);
    setTTSConfig(lang.config);
    speak(`Language set to ${lang.key}.`);
  };

  const handleGenderSelect = (key) => {
    setGender(key);
    setTTSConfig({ voice_gender: key });
    speak(`Voice set to ${key}.`);
  };

  const handleBack = () => {
    console.log("[VP] Navigating to: home");
    speak("Going back to dashboard.");
    navigate("home");
  };

  const handleMenuItem = (item) => {
    if (item.key === "voice") {
      setVoiceExpanded((v) => !v);
      return;
    }
    speak(`${item.label} is not available yet.`);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-button" onClick={handleBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Settings</h1>
      </div>

      <div className="card profile-header">
        <span className="profile-avatar-lg" aria-hidden="true">
          {USER.initials}
        </span>
        <div>
          <p className="profile-name">{USER.name}</p>
          <p className="profile-sub">
            {USER.accountNumber} | {USER.bank}
          </p>
        </div>
      </div>

      <div className="menu-list">
        {MENU_ITEMS.map((item) => (
          <button key={item.key} className="menu-item" onClick={() => handleMenuItem(item)}>
            <span className="menu-item-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="menu-item-label">{item.label}</span>
            <span className="menu-item-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>

      {voiceExpanded && (
        <div className="settings-section">
          <p className="section-title">Voice Language</p>
          <p className="section-subtitle">Choose how VoicePay speaks to you</p>

          {LANGUAGES.map((lang) => (
            <button
              key={lang.key}
              className={`option-card ${language === lang.key ? "selected" : ""}`}
              onClick={() => handleLanguageSelect(lang)}
            >
              <span className="option-emoji" aria-hidden="true">
                {lang.emoji}
              </span>
              <span className="option-text">
                <span className="option-title">{lang.key}</span>
                <span className="option-subtitle">{lang.subtitle}</span>
              </span>
            </button>
          ))}

          <p className="section-title">Voice Gender</p>
          <div className="gender-row">
            {GENDERS.map((g) => (
              <button
                key={g.key}
                className={`option-card gender-card ${gender === g.key ? "selected" : ""}`}
                onClick={() => handleGenderSelect(g.key)}
              >
                <span className="option-title">{g.label}</span>
              </button>
            ))}
          </div>

          <span className="about-pill">Powered by Intron Sahara v2.5</span>
        </div>
      )}

      <div className="settings-section">
        <p className="section-title">About</p>
        <div className="card about-card">
          <p className="about-version">VoicePay v1.0.0</p>
          <span className="about-pill">Powered by Intron Sahara v2.5</span>
        </div>
      </div>
    </div>
  );
}
