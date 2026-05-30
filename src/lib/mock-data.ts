export const mockDocuments = [
  { id: "1", name: "ITR_AY2024-25_Final.pdf", category: "ITR", size: "2.4 MB", uploaded: "2 days ago", encrypted: true },
  { id: "2", name: "GST_Notice_DRC-01.pdf", category: "GST", size: "812 KB", uploaded: "5 days ago", encrypted: true },
  { id: "3", name: "Balance_Sheet_FY24.xlsx", category: "Financials", size: "1.1 MB", uploaded: "1 week ago", encrypted: true },
  { id: "4", name: "Form_15CA_15CB.pdf", category: "Remittance", size: "640 KB", uploaded: "2 weeks ago", encrypted: true },
  { id: "5", name: "Trust_Deed_2019.pdf", category: "Legal", size: "3.8 MB", uploaded: "1 month ago", encrypted: true },
  { id: "6", name: "Capital_Gains_Statement.pdf", category: "Investments", size: "920 KB", uploaded: "1 month ago", encrypted: true },
];

export const mockDeadlines = [
  { id: "1", title: "Advance Tax — Q3 Installment", date: "15 Dec 2025", days: 12, severity: "high" as const },
  { id: "2", title: "GSTR-9 Annual Return", date: "31 Dec 2025", days: 28, severity: "medium" as const },
  { id: "3", title: "TDS Return Q2", date: "31 Jan 2026", days: 59, severity: "low" as const },
];

export const mockRecommendations = [
  { id: "1", title: "Restructure capital gains via LTCG harvesting", impact: "Est. ₹18.4L savings", tag: "Tax Optimization" },
  { id: "2", title: "Move passive holdings to family trust", impact: "Reduce estate exposure", tag: "Estate Planning" },
  { id: "3", title: "Review Section 80M dividend deduction", impact: "Est. ₹4.2L savings", tag: "Compliance" },
];

export const mockAdvisors = [
  { id: "1", name: "Arjun Mehta, FCA", role: "Chartered Accountant", expertise: ["International Tax", "Transfer Pricing", "M&A"], rating: 4.9, reviews: 187, fee: "₹25,000/hr", initials: "AM" },
  { id: "2", name: "Priya Raghavan", role: "Tax Lawyer", expertise: ["Litigation", "GST", "Income Tax Appeals"], rating: 4.8, reviews: 142, fee: "₹40,000/hr", initials: "PR" },
  { id: "3", name: "Vikram Shah", role: "Wealth Advisor", expertise: ["Family Office", "PMS", "Alternative Assets"], rating: 5.0, reviews: 96, fee: "₹35,000/hr", initials: "VS" },
  { id: "4", name: "Neha Iyer, CFA", role: "Wealth Advisor", expertise: ["Cross-border", "Estate Planning", "Trusts"], rating: 4.9, reviews: 211, fee: "₹30,000/hr", initials: "NI" },
  { id: "5", name: "Rahul Banerjee", role: "Chartered Accountant", expertise: ["Startup Tax", "ESOPs", "Capital Gains"], rating: 4.7, reviews: 168, fee: "₹22,000/hr", initials: "RB" },
  { id: "6", name: "Aanya Kapoor", role: "Tax Lawyer", expertise: ["Black Money Act", "FEMA", "Search & Seizure"], rating: 4.9, reviews: 78, fee: "₹50,000/hr", initials: "AK" },
];

export const mockChatHistory = [
  { id: "1", title: "LTCG on listed equities FY25", time: "Today" },
  { id: "2", title: "GST input credit on luxury assets", time: "Yesterday" },
  { id: "3", title: "Section 54F exemption strategy", time: "3 days ago" },
  { id: "4", title: "Trust taxation structure", time: "Last week" },
];

export const mockChatStarter = [
  "Optimise my long-term capital gains for AY 2025-26",
  "Summarise the latest GST notice in my vault",
  "What are the disclosure requirements for foreign assets?",
  "Compare family trust vs HUF for my portfolio",
];

// 12-month liability projection (₹ Cr) — for the dashboard area chart.
export const mockLiabilityTrend = [
  { m: "Apr", projected: 3.8, optimised: 3.2 },
  { m: "May", projected: 3.9, optimised: 3.25 },
  { m: "Jun", projected: 4.05, optimised: 3.35 },
  { m: "Jul", projected: 4.2, optimised: 3.42 },
  { m: "Aug", projected: 4.3, optimised: 3.48 },
  { m: "Sep", projected: 4.45, optimised: 3.55 },
  { m: "Oct", projected: 4.55, optimised: 3.6 },
  { m: "Nov", projected: 4.65, optimised: 3.66 },
  { m: "Dec", projected: 4.72, optimised: 3.7 },
  { m: "Jan", projected: 4.78, optimised: 3.74 },
  { m: "Feb", projected: 4.8, optimised: 3.76 },
  { m: "Mar", projected: 4.82, optimised: 3.78 },
];

// Wealth allocation — for the donut breakdown.
export const mockAllocation = [
  { name: "Listed Equity", value: 38, color: "var(--gold)" },
  { name: "Real Estate", value: 24, color: "var(--primary)" },
  { name: "Fixed Income", value: 18, color: "var(--success)" },
  { name: "PMS / AIF", value: 12, color: "var(--warning)" },
  { name: "Cash & Liquid", value: 8, color: "var(--muted-foreground)" },
];

// Trust signals shown across the platform.
export const trustSignals = [
  { label: "SOC 2 Type II", sub: "Audited Mar 2025" },
  { label: "ISO 27001:2022", sub: "Certified" },
  { label: "DPDP Act 2023", sub: "Compliant" },
  { label: "AES-256 + TLS 1.3", sub: "End-to-end" },
  { label: "Data residency", sub: "Mumbai · Bengaluru" },
  { label: "RBI / SEBI aligned", sub: "Advisory partner" },
];
