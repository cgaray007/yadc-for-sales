# yadc-for-sales

Yet Another Data Collector for Sales Teams

A lightweight CRM built on **Google Apps Script** and **Google Sheets** that enables sales agents to register leads and deposits while providing managers with a real-time analytics dashboard. The application is designed to be simple to deploy, easy to maintain, and entirely serverless.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-green.svg)

---

# Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [License](#license)

---

# Features

## Agent App

- Multi-language interface (English, Portuguese and Spanish)
- Lead registration with comprehensive client profile
- Deposit registration
- Automatic First Time Deposit (FTD) detection
- Automatic Additional Deposit detection
- Smart client search with autocomplete
- Review modal before submission
- Monthly statistics pill
- Responsive mobile-friendly interface
- Unicode normalization for reliable text handling

## Backend

- Token-based agent authentication
- Automatic audit logging
- Automatic agent URL generation
- Robust Client ID matching
- One-click spreadsheet initialization
- Google Sheets as the database
- Production-safe initialization (prevents accidental overwrite)

## Manager Dashboard

- Built-in analytics dashboard
- Monthly and All-Time reporting
- Team KPIs
- Per-agent performance metrics
- Individual and team target tracking
- Automatic rankings
- Standard Deposit (STD) analytics
- Average deposit calculations
- Configuration warnings
- Detection of inactive-agent activity

---

# Architecture

```text
┌─────────────────┐     ┌─────────────────┐      ┌─────────────────┐
│   Agent App     │────▶│ Google Apps     │────▶│ Google Sheets   │
│   (Index.html)  │◀────│ Script Backend  │◀────│ 5 Data Sheets   │
└─────────────────┘     └─────────────────┘      └─────────────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │ Manager Dashboard  │
                     │ HTML + Analytics   │
                     └────────────────────┘
```

---

# Sheet Structure

## Leads

| Column | Field |
|---------|-------|
| A | LeadID |
| B | ClientID |
| C | FullName |
| D | AgentCode |
| E | LeadDate |
| F | InvestmentExperience |
| G | Brand |
| H | Country |
| I | Savings |
| J | Banks |
| K | Investments |
| L | OwnRent |
| M | CryptoExchange |
| N | YearsOld |
| O | Comments |
| P | Campaign |
| Q | CreatedAt |

---

## Deposits

| Column | Field |
|---------|-------|
| A | DepositID |
| B | ClientID |
| C | DepositDate |
| D | Amount |
| E | DepositType (FTD / ADDITIONAL) |
| F | AgentCode |
| G | CreatedAt |

---

## Agents

| Column | Field |
|---------|-------|
| A | AgentCode |
| B | AgentName |
| C | Token |
| D | Active |
| E | AgentURL |

---

## AuditLog

| Column | Field |
|---------|-------|
| A | Timestamp |
| B | AgentCode |
| C | Action |
| D | ClientID |

---

## Targets

| Column | Field |
|---------|-------|
| A | AgentCode |
| B | Monthly Target |

---

# Installation

## 1. Create a Google Apps Script project

Create a new Apps Script project and attach it to a Google Spreadsheet.

---

## 2. Create the project files

Create the following files:

| File | Type |
|------|------|
| Code.gs | Script |
| Index.html | HTML |
| ManagerDashboard.html | HTML |

Copy the project source into each file.

---

## 3. Initialize the system

Run:

```javascript
initializeSystem();
```

This creates:

- Agents
- Leads
- Deposits
- AuditLog
- Targets

The initialization function includes safety checks and will refuse to overwrite existing production data.

---

## 4. Generate Agent URLs

Run:

```javascript
generateAgentUrls();
```

Each active agent receives their own secure access URL.

---

## 5. Deploy

Deploy as a Web App.

Execute as:

```
Me
```

Access:

```
Anyone
```

Copy the deployment URL.

---

# Configuration

## Agent Configuration

Edit the **Agents** sheet.

Example:

```javascript
['AG001','John','token123',true,'']
['AG002','Jane','token456',true,'']
```

---

## Sales Targets

The **Targets** sheet defines monthly goals.

Example:

| Agent | Target |
|-------|---------:|
| AG001 | 30000 |
| AG002 | 25000 |
| AG003 | 20000 |

Targets are automatically used by the Manager Dashboard to calculate:

- Individual completion %
- Team completion %
- Remaining target
- Goal achievement

If no targets exist, the dashboard will continue operating while displaying a configuration warning.

---

# Usage

## Agent Workflow

### Register Lead

- Enter Client ID
- Enter client information
- Review submission
- Submit

---

### Register Deposit

- Search existing client
- Enter amount
- Enter deposit date
- Review
- Submit

The system automatically classifies the deposit as:

- FTD
- Additional Deposit

---

### Monthly Statistics

The statistics widget displays:

- Total deposited amount
- FTD count
- Additional Deposit count

---

## Manager Dashboard

Open:

```
...?manager=1
```

The dashboard includes:

### Team KPIs

- Total Leads
- FTD
- Additional Deposits
- Standard Deposits
- Deposit Volume
- Average Deposit
- Goal Completion

### Per-Agent Statistics

- Leads
- FTD
- Additional Deposits
- Standard Deposit Count
- Standard Deposit Volume
- Total Deposit Volume
- Average Deposit
- Goal Completion %

### Rankings

- Top FTD
- Highest Deposit Volume
- Highest Standard Deposit Count
- Highest Standard Deposit Volume
- Highest Average Deposit

### Goal Tracking

Displays:

- Individual targets
- Team target
- Remaining amount
- Completion percentage

### Activity Validation

The dashboard separately reports activity from inactive or unknown agents, making data inconsistencies immediately visible.

### Time Filters

Supports:

- Any month
- Any year
- All Time mode

---

# API Reference

## Server Functions

### createLead(payload)

Creates a new lead.

Returns

```javascript
{
  success,
  leadId
}
```

---

### addDeposit(payload)

Registers a deposit.

Automatically determines:

- FTD
- ADDITIONAL

Returns

```javascript
{
  success,
  depositType,
  depositId
}
```

---

### searchClients(query)

Performs fuzzy client search.

---

### findClient(clientId)

Returns an exact client match.

---

### getMyDeposits(agentCode)

Returns monthly agent statistics.

---

### getManagerDashboard(year, month)

Returns the complete Manager Dashboard dataset.

Includes:

- Team KPIs
- Agent metrics
- Rankings
- Goal tracking
- Configuration warnings

Examples:

```javascript
// June 2026
getManagerDashboard(2026,5);

// All Time
getManagerDashboard(0,-1);
```

---

# Screenshots

(Add screenshots here.)

---

# File Structure

```text
Apps Script Project

├── Code.gs
├── Index.html
├── ManagerDashboard.html
│
└── Google Sheets
    ├── Agents
    ├── Leads
    ├── Deposits
    ├── AuditLog
    └── Targets
```

---

# Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

---

## Development Tips

Useful helper functions:

```javascript
testFind();

testSearch();

testManagerDashboard();

testManagerDashboardAllTime();
```

For frontend debugging, use your browser developer tools.

`initializeSystem()` is intended only for first-time setup and contains safeguards against overwriting production data.

---

# License

MIT License.

Free for commercial and personal use.

---

# Support

If something doesn't work:

1. Check the browser console.
2. Check Apps Script execution logs.
3. Verify all sheet names match the `SHEETS` configuration.
4. Ensure the project has been initialized.
5. Verify your deployment URL is current.

---

Built with ❤️ using Google Apps Script, Google Sheets and vanilla JavaScript.