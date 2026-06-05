# yadc-for-sales
yet another data collector for sales teams

A Google Apps Script-powered web application for sales agents to register leads and deposits, with manager analytics dashboard support. Built for Google Sheets as the backend database.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-green.svg)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [Contributing](#contributing)

---

## Features

### Agent App
- **Multi-language UI** — Portuguese, Spanish, English (switchable)
- **Lead Registration** — 16-field comprehensive client profile
- **Deposit Entry** — Auto-detects FTD vs Additional deposits
- **Smart Client Search** — Fuzzy search by ID or name with autocomplete
- **Review Modal** — Confirm data before submission
- **Real-time Stats** — Monthly deposit summary pill (FTD/Additional counts + total amount)
- **Unicode Normalization** — Handles smart quotes, non-breaking spaces, etc.
- **Responsive Design** — Mobile-friendly DM Sans interface

### Backend
- **Agent Authentication** — Token-based URL validation
- **Audit Logging** — Every action timestamped
- **Auto URL Generation** — Per-agent access links
- **Data Integrity** — Robust ID matching (handles numeric/string IDs)
- **One-Click Setup** — `initializeSystem()` creates all sheets

### Manager View (Ready for Extension)
- `getLeads()`, `getDeposits()`, `getAnalytics()` functions built-in
- Looker Studio integration guide included
- Custom HTML dashboard support

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐      ┌─────────────────┐
│   Agent App     │────▶│  Google Apps    │────▶│  Google Sheets  │
│   (Index.html)  │◀────│   Script        │◀────│  (4 sheets)     │
└─────────────────┘     └─────────────────┘      └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Manager View   │
                        │ (Looker Studio  │
                        │  or Custom HTML)│
                        └─────────────────┘
```

### Sheet Structure

**Leads** (17 columns)
| Column | Field | Type |
|--------|-------|------|
| A | LeadID | Auto-generated UUID |
| B | ClientID | User-defined (forced text) |
| C | FullName | Text |
| D | AgentCode | Text |
| E | LeadDate | Date |
| F | InvestmentExperience | Text |
| G | Brand | Text |
| H | Country | Text |
| I | Savings | Number |
| J | Banks | Text |
| K | Investments | Number |
| L | OwnRent | Own / Rent |
| M | CryptoExchange | Text |
| N | YearsOld | Number |
| O | Comments | Text |
| P | Campaign | Text (manual) |
| Q | CreatedAt | Timestamp |

**Deposits** (7 columns)
| Column | Field | Type |
|--------|-------|------|
| A | DepositID | Auto-generated UUID |
| B | ClientID | Text |
| C | DepositDate | Date |
| D | Amount | Number |
| E | DepositType | FTD / Additional |
| F | AgentCode | Text |
| G | CreatedAt | Timestamp |

**Agents** (5 columns)
| Column | Field |
|--------|-------|
| A | AgentCode |
| B | AgentName |
| C | Token |
| D | Active |
| E | AgentURL (auto-generated) |

**AuditLog** (4 columns)
| Column | Field |
|--------|-------|
| A | Timestamp |
| B | AgentCode |
| C | Action |
| D | ClientID |

---

## Installation

### 1. Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Create new project
3. Create a new spreadsheet (or use existing)

### 2. Add Files

Create these files in the Apps Script editor:

| File | Type | Content |
|------|------|---------|
| `Code.gs` | Script | Backend logic (from `.txt` file) |
| `Index.html` | HTML | Agent interface (from `.html` file) |
| `ManagerDashboard.html` | HTML | *(Optional)* Manager view |

### 3. Initialize System

Run `initializeSystem()` from the Apps Script editor. This creates:
- `Agents` sheet with 3 demo agents
- `Leads` sheet with headers
- `Deposits` sheet with headers
- `AuditLog` sheet with headers

### 4. Generate Agent URLs

Run `generateAgentUrls()` to populate the `AgentURL` column. Share these URLs with agents.

### 5. Deploy Web App

1. **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Access: **Anyone** (or restrict to your domain)
5. Copy the deployment URL

---

## Configuration

### Agent Setup

Edit the `Agents` sheet directly or modify `createAgentsSheet_()`:

```javascript
['AG001','João',  '9x8JkP2', true, ''],
['AG002','Maria', 'Q4LmT91', true, ''],
['AG003','Pedro', 'K7NpX55', true, '']
```

### Manager Token

Change the default manager token in `Code.gs`:

```javascript
const MANAGER_TOKEN = 'your-secure-token-here';
```

Manager URL: `https://script.google.com/.../exec?manager=1&token=your-secure-token`

---

## Usage

### Agent Workflow

1. **New Lead Tab**
   - Fill Client ID, Name, Date, Age
   - Add Brand, Country, Financial profile
   - Select Own/Rent property
   - Add investment experience and comments
   - Click "Review before submitting" → Confirm

2. **Deposit Tab**
   - Search client by ID or name (autocomplete)
   - Enter amount and date
   - System auto-detects FTD vs Additional
   - Click "Review before submitting" → Confirm

3. **Stats Pill**
   - Click the blue pill to see monthly breakdown
   - Shows total amount, FTD count, Additional count
   - Auto-refreshes after each deposit

### Manager Workflow

**Option A: Looker Studio**
1. Create data sources for `Leads` and `Deposits` sheets
2. Blend on `ClientID`
3. Build charts and share

**Option B: Custom Dashboard**
1. Access `ManagerDashboard.html` via `?manager=1&token=...`
2. Filter by agent, date range, deposit type
3. View KPIs, trends, and detailed tables

---

## API Reference

### Server-Side Functions (Callable from Client)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `createLead(payload)` | `{clientId, fullName, leadDate, investmentExperience, brand, country, savings, banks, investments, ownRent, cryptoExchange, yearsOld, comments, agentCode}` | `{success, leadId}` | Creates lead row |
| `addDeposit(payload)` | `{clientId, amount, depositDate, agentCode}` | `{success, depositType, depositId}` | Creates deposit, auto-detects FTD |
| `searchClients(query)` | `string` | `Array<{found, leadId, clientId, fullName, agentCode, leadDate, investmentExperience}>` | Fuzzy search |
| `findClient(clientId)` | `string` | `{found, leadId, clientId, fullName, agentCode, leadDate, investmentExperience}` | Exact lookup |
| `getMyDeposits(agentCode)` | `string` | `{month, totalAmount, countFTD, countAdd, total}` | Monthly stats |
| `getLeads(filters)` | `{agentCode, dateFrom, dateTo, experience}` | `Array<lead>` | Filtered leads |
| `getDeposits(filters)` | `{agentCode, dateFrom, dateTo, depositType}` | `Array<deposit>` | Filtered deposits |
| `getAnalytics(filters)` | `{agentCode, dateFrom, dateTo}` | `{totalLeads, totalDeposits, totalAmount, ftdCount, additionalCount, conversionRate, avgDeposit, experienceBreakdown, agentBreakdown, dailyTrend}` | Dashboard data |
| `getAgents()` | — | `Array<{agentCode, agentName}>` | Active agents |

### Client-Side Functions

| Function | Description |
|----------|-------------|
| `setLang('pt'\|'es'\|'en')` | Switch UI language |
| `switchTab('lead'\|'deposit', btn)` | Switch panel |
| `normalizeField(el, shouldTrim)` | Clean input text |
| `doExactLookup()` | Search client |
| `reviewLead()` / `reviewDeposit()` | Open review modal |
| `confirmSend()` | Submit to server |
| `loadStats()` | Refresh stats pill |
| `togglePopover()` | Show/hide stats detail |

---

## Screenshots


<img width="663" height="1274" alt="WhatsApp Image 2026-06-04 at 16 35 55" src="https://github.com/user-attachments/assets/33bbb4c7-dc31-4f6a-b60d-156f3a4098e4" />

<img width="676" height="549" alt="WhatsApp Image 2026-06-04 at 16 35 55 (1)" src="https://github.com/user-attachments/assets/d773d5b5-c509-47cf-abf8-a3082148b43b" />

```
[Agent App - Lead Form]
[Agent App - Deposit Search]
[Manager Dashboard - Overview]
[Manager Dashboard - Leads Table]
```

---

## File Structure

```
📁 Apps Script Project
├── 📄 Code.gs                    # Backend: routing, logic, analytics
├── 📄 Index.html                 # Frontend: agent lead capture app
├── 📄 ManagerDashboard.html      # Frontend: manager read-only view (optional)
│
└── 📊 Google Sheets
    ├── Agents        (credentials & URLs)
    ├── Leads         (17 columns, client profiles)
    ├── Deposits      (7 columns, transactions)
    └── AuditLog      (4 columns, activity log)
```

---

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Tips

- **Test backend functions** in Apps Script editor with `testSearch()`, `testFind()`, `testAnalytics()`
- **Debug client-side** — open browser console (F12) for `[DEBUG]` logs
- **Reset data** — run `initializeSystem()` (⚠️ wipes all data)

---

## License

MIT License — free for commercial and personal use.

---

## Support

For issues or questions:
1. Check browser console for JavaScript errors
2. Check Apps Script execution logs (View → Logs)
3. Verify sheet names match `SHEETS` config exactly
4. Ensure `doGet()` routing matches your URL parameters

---

**Built with** Google Apps Script · Google Sheets · Chart.js · DM Sans
