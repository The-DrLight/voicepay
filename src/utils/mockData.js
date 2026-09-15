export const USER = {
  name: "Amara Okafor",
  initials: "AO",
  balance: 247500.0,
  income: 150000,
  expenses: 28000,
  accountNumber: "0123456789",
  bank: "GTBank",
};

export const NIGERIAN_BANKS = [
  "GTBank",
  "Access Bank",
  "Zenith Bank",
  "First Bank",
  "UBA",
  "Stanbic IBTC",
  "Fidelity",
  "Sterling",
  "Wema",
  "Polaris",
  "Kuda",
  "Opay",
  "PalmPay",
  "Moniepoint",
];

export const NETWORKS = [
  { name: "MTN", color: "#FFC300" },
  { name: "Airtel", color: "#FF0000" },
  { name: "Glo", color: "#008751" },
  { name: "9mobile", color: "#006600" },
];

export const DATA_PLANS = {
  MTN: [
    { size: "1GB", validity: "30 days", price: 300 },
    { size: "2GB", validity: "30 days", price: 500 },
    { size: "5GB", validity: "30 days", price: 1500 },
    { size: "10GB", validity: "30 days", price: 3000 },
  ],
  Airtel: [
    { size: "1GB", validity: "30 days", price: 300 },
    { size: "2GB", validity: "30 days", price: 500 },
    { size: "5GB", validity: "30 days", price: 1400 },
    { size: "10GB", validity: "30 days", price: 2900 },
  ],
  Glo: [
    { size: "1.5GB", validity: "30 days", price: 300 },
    { size: "2.9GB", validity: "30 days", price: 500 },
    { size: "5.8GB", validity: "30 days", price: 1500 },
    { size: "10GB", validity: "30 days", price: 2500 },
  ],
  "9mobile": [
    { size: "1GB", validity: "30 days", price: 300 },
    { size: "2GB", validity: "30 days", price: 500 },
    { size: "4.5GB", validity: "30 days", price: 1500 },
    { size: "11GB", validity: "30 days", price: 3000 },
  ],
};

export const AIRTIME_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export const DISCOS = ["EKEDC", "IKEDC", "AEDC", "PHEDC", "EEDC"];

export const BILL_CATEGORIES = [
  { key: "electricity", label: "Electricity", icon: "⚡" },
  { key: "cable", label: "Cable TV", icon: "📺" },
  { key: "water", label: "Water", icon: "💧" },
  { key: "internet", label: "Internet", icon: "🌐" },
  { key: "rent", label: "Rent", icon: "🏠" },
  { key: "postpaid", label: "Postpaid", icon: "📞" },
];

export const TRANSACTIONS = [
  {
    id: 1,
    label: "Eko Works Salary",
    type: "credit",
    amount: 150000,
    date: "Today · 8:30 AM",
    group: "Today",
    language: "English",
    kind: "transfer",
  },
  {
    id: 2,
    label: "Kemi Adeyemi",
    type: "credit",
    amount: 25000,
    date: "Today · 11:19 AM",
    group: "Today",
    language: "Yoruba-EN",
    kind: "transfer",
  },
  {
    id: 3,
    label: "Owo si Tunde",
    type: "debit",
    amount: 5000,
    date: "Yesterday · 9:14 AM",
    group: "Yesterday",
    language: "Yoruba-EN",
    kind: "transfer",
  },
  {
    id: 4,
    label: "MTN Data 2GB",
    type: "debit",
    amount: 500,
    date: "Yesterday · 6:02 PM",
    group: "Yesterday",
    language: "EN",
    kind: "airtime",
  },
  {
    id: 5,
    label: "Send money for mama",
    type: "debit",
    amount: 10000,
    date: "12 Sep · 4:47 PM",
    group: "Earlier",
    language: "Pidgin-EN",
    kind: "transfer",
  },
  {
    id: 6,
    label: "EKEDC Electricity",
    type: "debit",
    amount: 5000,
    date: "10 Sep · 2:10 PM",
    group: "Earlier",
    language: "EN",
    kind: "bills",
  },
  {
    id: 7,
    label: "DSTV Subscription",
    type: "debit",
    amount: 2500,
    date: "08 Sep · 10:00 AM",
    group: "Earlier",
    language: "EN",
    kind: "bills",
  },
  {
    id: 8,
    label: "Airtime recharge MTN",
    type: "debit",
    amount: 500,
    date: "06 Sep · 7:05 PM",
    group: "Earlier",
    language: "EN",
    kind: "airtime",
  },
];
