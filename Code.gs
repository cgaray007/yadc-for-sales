/*********************************************************
 * CONFIG
 *********************************************************/

const SHEETS = {
  AGENTS:   'Agents',
  LEADS:    'Leads',
  DEPOSITS: 'Deposits',
  AUDIT:    'AuditLog',
  TARGETS:  'Targets'
};

/*********************************************************
 * WEB APP
 *********************************************************/

function doGet(e) {
  const agent   = e.parameter.agent   || '';
  const token   = e.parameter.t       || '';
  const manager = e.parameter.manager || '0';

  if (manager === '1') {
    const template = HtmlService.createTemplateFromFile('ManagerDashboard');
    return template
      .evaluate()
      .setTitle('Manager Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const validation = validateAgent(agent, token);
  if (!validation.valid) {
    return HtmlService.createHtmlOutput('<h2>Agente inválido</h2>');
  }

  const template = HtmlService.createTemplateFromFile('Index');
  template.AGENT_CODE = agent;
  template.AGENT_NAME = validation.agentName;

  return template
    .evaluate()
    .setTitle('Lead Capture');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*********************************************************
 * INITIALIZATION
 *********************************************************/

function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Safety guard — refuse to run if any core sheet already has data rows,
  // to prevent accidentally wiping a production spreadsheet.
  const coreSheets = [SHEETS.LEADS, SHEETS.DEPOSITS, SHEETS.AGENTS];
  for (let i = 0; i < coreSheets.length; i++) {
    const existing = ss.getSheetByName(coreSheets[i]);
    if (existing && existing.getLastRow() > 1) {
      throw new Error(
        'Sheet "' + coreSheets[i] + '" already contains data. ' +
        'initializeSystem() is for first-time setup only. ' +
        'Delete all data rows manually before re-running.'
      );
    }
  }

  createAgentsSheet_(ss);
  createLeadsSheet_(ss);
  createDepositsSheet_(ss);
  createAuditLogSheet_(ss);
  createTargetsSheet_(ss);
  Logger.log('System initialized.');
}

function createAgentsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.AGENTS);
  if (!sheet) sheet = ss.insertSheet(SHEETS.AGENTS);
  sheet.clear();
  sheet.getRange(1,1,1,5).setValues([[
    'AgentCode','AgentName','Token','Active','AgentURL'
  ]]);
  sheet.getRange(2,1,3,5).setValues([
    ['AG001','Agent One',  'YOUR_TOKEN_1', true, ''],
    ['AG002','Agent Two', 'YOUR_TOKEN_2', true, ''],
    ['AG003','Agent Three', 'YOUR_TOKEN_3', true, '']
  ]);
  sheet.setFrozenRows(1);
}

function createLeadsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.LEADS);
  if (!sheet) sheet = ss.insertSheet(SHEETS.LEADS);
  sheet.clear();
  sheet.getRange(1,1,1,17).setValues([[
    'LeadID','ClientID','FullName','AgentCode',
    'LeadDate','InvestmentExperience',
    'Brand','Country','Savings','Banks','Investments',
    'OwnRent','CryptoExchange','YearsOld','Comments',
    'Campaign','CreatedAt'
  ]]);
  sheet.setFrozenRows(1);
}

function createDepositsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.DEPOSITS);
  if (!sheet) sheet = ss.insertSheet(SHEETS.DEPOSITS);
  sheet.clear();
  sheet.getRange(1,1,1,7).setValues([[
    'DepositID','ClientID','DepositDate','Amount','DepositType','AgentCode','CreatedAt'
  ]]);
  sheet.setFrozenRows(1);
}

function createAuditLogSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.AUDIT);
  if (!sheet) sheet = ss.insertSheet(SHEETS.AUDIT);
  sheet.clear();
  sheet.getRange(1,1,1,4).setValues([[
    'Timestamp','AgentCode','Action','ClientID'
  ]]);
  sheet.setFrozenRows(1);
}

function createTargetsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.TARGETS);
  if (!sheet) sheet = ss.insertSheet(SHEETS.TARGETS);
  sheet.clear();
  sheet.getRange(1,1,1,2).setValues([['AgentCode','Target']]);
  sheet.getRange(2,1,3,2).setValues([
    ['AG001', 30000],
    ['AG002', 25000],
    ['AG003', 20000]
  ]);
  sheet.setFrozenRows(1);
}

/*********************************************************
 * AGENT VALIDATION
 *********************************************************/

function validateAgent(agentCode, token) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AGENTS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const isActive = row[3] === true || String(row[3]).trim().toUpperCase() === 'TRUE';
    if (
      String(row[0]).trim() === String(agentCode).trim() &&
      String(row[2]).trim() === String(token).trim()     &&
      isActive
    ) {
      return { valid: true, agentName: String(row[1]).trim() };
    }
  }
  return { valid: false };
}

/*********************************************************
 * HELPERS - ID MATCHING
 *********************************************************/

function idsMatch_(sheetVal, inputVal) {
  const a = String(sheetVal).trim();
  const b = String(inputVal).trim();
  return a === b;
}

/*********************************************************
 * SAFE NUMBER HELPER
 *********************************************************/

/**
 * Returns a finite number or 0. Prevents NaN/Infinity from
 * propagating into formatted output. isFinite(NaN) is false,
 * so the !isNaN check is not needed.
 */
function safeNum_(value) {
  const n = Number(value);
  return isFinite(n) ? n : 0;
}

/*********************************************************
 * LEADS
 *********************************************************/

function createLead(payload) {
  // Validate first — before any normalisation or sheet reads
  if (!payload.agentCode) throw new Error('Agent code is required');
  if (!payload.leadDate)  throw new Error('Data do lead é obrigatória');

  payload.clientId = normalizeText(payload.clientId);
  payload.fullName = normalizeText(payload.fullName);

  if (!payload.clientId) throw new Error('Client ID obrigatório');
  if (!payload.fullName) throw new Error('Nome completo obrigatório');

  // Read sheet once — check existence and append in the same data pass
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEADS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (idsMatch_(data[i][1], payload.clientId)) {
      throw new Error('Client ID já cadastrado: ' + payload.clientId);
    }
  }

  const leadId = generateLeadId();

  sheet.appendRow([
    leadId,
    String(payload.clientId),
    payload.fullName,
    payload.agentCode,
    payload.leadDate,
    payload.investmentExperience || '',
    payload.brand          || '',
    payload.country        || '',
    payload.savings        || '',
    payload.banks          || '',
    payload.investments    || '',
    payload.ownRent        || '',
    payload.cryptoExchange || '',
    payload.yearsOld       || '',
    payload.comments       || '',
    '',
    new Date()
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 2).setNumberFormat('@');
  writeAudit(payload.agentCode, 'CREATE_LEAD', payload.clientId);

  return { success: true, leadId: leadId };
}

// Kept for any external callers — internally createLead no longer uses this.
function leadExists(clientId) {
  if (!clientId) return false;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEADS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (idsMatch_(data[i][1], clientId)) return true;
  }
  return false;
}

/*********************************************************
 * CLIENT SEARCH - exact match by ID
 *********************************************************/

function findClient(clientId) {
  clientId = String(clientId).trim();
  if (!clientId) return { found: false };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEADS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (idsMatch_(row[1], clientId)) {
      return {
        found:                true,
        leadId:               String(row[0]),
        clientId:             String(row[1]),
        fullName:             String(row[2]),
        agentCode:            String(row[3]),
        leadDate:             row[4] ? new Date(row[4]).toISOString() : '',
        investmentExperience: String(row[5])
      };
    }
  }
  return { found: false };
}

/*********************************************************
 * CLIENT SEARCH - fuzzy / autocomplete
 *********************************************************/

function searchClients(query) {
  query = String(query).trim().toLowerCase();
  if (!query) return [];

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEADS);
  if (!sheet) return [];

  const data    = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    if (!row[1] && !row[2]) continue;
    const clientId = String(row[1] || '').toLowerCase();
    const fullName = String(row[2] || '').toLowerCase();

    if (clientId.includes(query) || fullName.includes(query)) {
      results.push({
        found:                true,
        leadId:               String(row[0] || ''),
        clientId:             String(row[1] || ''),
        fullName:             String(row[2] || ''),
        agentCode:            String(row[3] || ''),
        leadDate:             row[4] ? new Date(row[4]).toISOString() : '',
        investmentExperience: String(row[5] || '')
      });
      if (results.length >= 8) break;
    }
  }
  return results;
}

/*********************************************************
 * DEPOSITS
 *********************************************************/

function addDeposit(payload) {
  if (!payload.agentCode)                             throw new Error('Agent code is required');
  if (!payload.depositDate)                           throw new Error('Deposit date is required');
  if (!payload.amount || Number(payload.amount) <= 0) throw new Error('Amount must be greater than zero');

  const client = findClient(payload.clientId);
  if (!client.found) throw new Error('Cliente não encontrado: ' + payload.clientId);

  // Read Deposits sheet once — check for existing FTD and append in the same pass
  const sheet       = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DEPOSITS);
  const data        = sheet.getDataRange().getValues();
  const clientIdStr = String(payload.clientId).trim();

  let existingFTD = false;
  for (let i = 1; i < data.length; i++) {
    if (idsMatch_(data[i][1], clientIdStr) && String(data[i][4]).trim() === 'FTD') {
      existingFTD = true;
      break;
    }
  }

  const depositType = existingFTD ? 'ADDITIONAL' : 'FTD';
  const depositId   = generateDepositId();

  sheet.appendRow([
    depositId,
    clientIdStr,
    payload.depositDate,
    Number(payload.amount),
    depositType,
    payload.agentCode,
    new Date()
  ]);

  writeAudit(payload.agentCode, 'ADD_DEPOSIT', clientIdStr);
  return { success: true, depositType: depositType, depositId: depositId };
}

// hasFTD kept for any external callers — addDeposit no longer calls this.
function hasFTD(clientId) {
  if (!clientId) return false;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DEPOSITS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (idsMatch_(data[i][1], clientId) && data[i][4] === 'FTD') return true;
  }
  return false;
}

function getMyDeposits(agentCode) {
  if (!agentCode) throw new Error('Agent code is required');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DEPOSITS);
  const data  = sheet.getDataRange().getValues();
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  let totalAmount = 0, countFTD = 0, countAdd = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[5]).trim() !== String(agentCode).trim()) continue;
    const d = row[2] ? new Date(row[2]) : null;
    if (!d || isNaN(d.getTime())) continue;
    if (d.getMonth() !== month || d.getFullYear() !== year) continue;
    totalAmount += safeNum_(row[3]);
    if (String(row[4]).trim() === 'FTD')        countFTD++;
    else if (String(row[4]).trim() === 'ADDITIONAL') countAdd++;
  }

  return {
    month:       now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    totalAmount: safeNum_(totalAmount),
    countFTD:    countFTD,
    countAdd:    countAdd,
    total:       countFTD + countAdd
  };
}

/*********************************************************
 * MANAGER DASHBOARD - HELPERS
 *********************************************************/

/**
 * Ranks agents by a numeric field, descending, top 5, excluding zero values.
 * @param {Array}  arr   - array of agentStats objects
 * @param {string} field - field name to rank by
 */
function rankAgentsBy_(arr, field) {
  return arr
    .filter(function(a) { return a[field] > 0; })
    .sort(function(a, b) { return b[field] - a[field]; })
    .slice(0, 5)
    .map(function(a) { return { code: a.code, name: a.name, value: a[field] }; });
}

/*********************************************************
 * MANAGER DASHBOARD
 *********************************************************/

/**
 * Returns dashboard data for a given month/year.
 * @param {number} year  - full year, e.g. 2025. Ignored when month is -1.
 * @param {number} month - 0-indexed month (0=Jan … 11=Dec).
 *                         Pass month = -1 to get ALL TIME data.
 */
function getManagerDashboard(year, month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const leadsSheet    = ss.getSheetByName(SHEETS.LEADS);
  const depositsSheet = ss.getSheetByName(SHEETS.DEPOSITS);
  const agentsSheet   = ss.getSheetByName(SHEETS.AGENTS);
  const targetsSheet  = ss.getSheetByName(SHEETS.TARGETS);

  if (!leadsSheet || !depositsSheet || !agentsSheet) {
    throw new Error('Required sheets not found. Please run initializeSystem() first.');
  }

  // Determine period. allTime is signalled by month === -1.
  const now     = new Date();
  const allTime = (typeof month === 'number' && month === -1);
  const filterYear  = (!allTime && typeof year  === 'number' && year  > 0) ? year  : now.getFullYear();
  const filterMonth = (!allTime && typeof month === 'number' && month >= 0) ? month : now.getMonth();

  const leadsData    = leadsSheet.getDataRange().getValues();
  const depositsData = depositsSheet.getDataRange().getValues();
  const agentsData   = agentsSheet.getDataRange().getValues();
  const targetsData  = targetsSheet ? targetsSheet.getDataRange().getValues() : [];

  // ── Targets map ─────────────────────────────────────
  const targetsMap = {};
  for (let i = 1; i < targetsData.length; i++) {
    const row = targetsData[i];
    const code = String(row[0] || '').trim();
    if (code && row[1] !== '' && row[1] !== null && row[1] !== undefined) {
      targetsMap[code] = safeNum_(row[1]);
    }
  }

  // ── Agents map (active only) ─────────────────────────
  const agentsMap = {};
  for (let i = 1; i < agentsData.length; i++) {
    const row      = agentsData[i];
    const code     = String(row[0] || '').trim();
    const name     = String(row[1] || '').trim();
    const isActive = row[3] === true || String(row[3]).trim().toUpperCase() === 'TRUE';
    if (code && name && isActive) {
      agentsMap[code] = { name: name, code: code };
    }
  }

  if (Object.keys(agentsMap).length === 0) {
    throw new Error('No active agents found. Please check the Agents sheet.');
  }

  // ── Initialize stats ─────────────────────────────────
  const agentStats = {};
  let   teamGoal   = 0;

  Object.keys(agentsMap).forEach(function(code) {
    const target = safeNum_(targetsMap[code]);
    agentStats[code] = {
      code:          code,
      name:          agentsMap[code].name,
      target:        target,
      leads:         0,
      ftd:           0,
      additional:    0,
      stdCount:      0,
      stdAmount:     0,
      depositAmount: 0,
      totalDeposits: 0,
      averageDeposit:0,
      goalPercent:   0
    };
    teamGoal += target;
  });

  const teamStats = {
    leads: 0, inactiveLeads: 0,
    ftd: 0, additional: 0, stdCount: 0, stdAmount: 0,
    depositAmount: 0, inactiveDepositAmount: 0, inactiveDepositCount: 0,
    totalDeposits: 0, averageDeposit: 0,
    goal: teamGoal, achieved: 0, remaining: 0, completionPercent: 0
  };

  // ── Process leads (filter by period) ─────────────────
  for (let i = 1; i < leadsData.length; i++) {
    const row       = leadsData[i];
    const agentCode = String(row[3] || '').trim();
    const leadDate  = row[4] ? new Date(row[4]) : null;

    if (!leadDate || isNaN(leadDate.getTime())) continue;

    const inPeriod = allTime
      ? true
      : (leadDate.getFullYear() === filterYear && leadDate.getMonth() === filterMonth);

    if (!inPeriod) continue;

    // All leads count toward the team total.
    // Track inactive-agent leads separately so the dashboard can flag them.
    teamStats.leads++;
    if (agentStats[agentCode]) {
      agentStats[agentCode].leads++;
    } else {
      teamStats.inactiveLeads++;
    }
  }

  // ── Process deposits (filter by period) ──────────────
  for (let i = 1; i < depositsData.length; i++) {
    const row         = depositsData[i];
    const agentCode   = String(row[5] || '').trim();
    const amount      = safeNum_(row[3]);
    const depositType = String(row[4] || '').trim();
    const depDate     = row[2] ? new Date(row[2]) : null;

    if (!depDate || isNaN(depDate.getTime())) continue;
    if (amount <= 0) continue;

    const inPeriod = allTime
      ? true
      : (depDate.getFullYear() === filterYear && depDate.getMonth() === filterMonth);

    if (!inPeriod) continue;

    // Only attribute to agent stats for ACTIVE agents
    if (agentStats[agentCode]) {
      const agent = agentStats[agentCode];
      agent.totalDeposits++;
      agent.depositAmount += amount;

      if (depositType === 'FTD') {
        agent.ftd++;
        teamStats.ftd++;
      } else if (depositType === 'ADDITIONAL') {
        agent.additional++;
        teamStats.additional++;
        if (amount >= 1000) {
          agent.stdCount++;
          agent.stdAmount += amount;
          teamStats.stdCount++;
          teamStats.stdAmount += amount;
        }
      }
    } else {
      // Deposit from an inactive/unknown agent — count toward team total
      // but track separately so dashboard can surface the discrepancy.
      teamStats.inactiveDepositAmount += amount;
      teamStats.inactiveDepositCount++;
    }
    // Team totals include ALL deposits regardless of agent status
    teamStats.depositAmount  += amount;
    teamStats.totalDeposits++;
  }

  // ── Per-agent derived metrics ─────────────────────────
  Object.keys(agentStats).forEach(function(code) {
    const a = agentStats[code];
    a.averageDeposit = a.totalDeposits > 0 ? a.depositAmount / a.totalDeposits : 0;
    a.goalPercent    = a.target > 0 ? (a.depositAmount / a.target) * 100 : 0;

    // Guard against any remaining NaN/Inf
    a.averageDeposit = safeNum_(a.averageDeposit);
    a.goalPercent    = safeNum_(a.goalPercent);
  });

  // ── Team derived metrics ──────────────────────────────
  teamStats.averageDeposit   = teamStats.totalDeposits > 0
    ? safeNum_(teamStats.depositAmount / teamStats.totalDeposits) : 0;
  teamStats.achieved         = safeNum_(teamStats.depositAmount);
  teamStats.remaining        = Math.max(0, safeNum_(teamStats.goal - teamStats.achieved));
  teamStats.completionPercent= teamStats.goal > 0
    ? safeNum_((teamStats.achieved / teamStats.goal) * 100) : 0;

  // ── Rankings ─────────────────────────────────────────
  const arr = Object.values(agentStats);

  const rankings = {
    topFTD:           rankAgentsBy_(arr, 'ftd'),
    topVolume:        rankAgentsBy_(arr, 'depositAmount'),
    topSTDCount:      rankAgentsBy_(arr, 'stdCount'),
    topSTDAmount:     rankAgentsBy_(arr, 'stdAmount'),
    topAverageDeposit:rankAgentsBy_(arr, 'averageDeposit')
  };

  // ── Readable period label ─────────────────────────────
  let periodLabel;
  if (allTime) {
    periodLabel = 'All time';
  } else {
    const d = new Date(filterYear, filterMonth, 1);
    periodLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  return {
    period: periodLabel,
    filterYear:  allTime ? null : filterYear,
    filterMonth: allTime ? null : filterMonth,
    team: {
      leads:                  teamStats.leads,
      inactiveLeads:          teamStats.inactiveLeads,
      ftd:                    teamStats.ftd,
      additional:             teamStats.additional,
      stdCount:               teamStats.stdCount,
      stdAmount:              teamStats.stdAmount,
      depositAmount:          teamStats.depositAmount,
      inactiveDepositAmount:  teamStats.inactiveDepositAmount,
      inactiveDepositCount:   teamStats.inactiveDepositCount,
      averageDeposit:         teamStats.averageDeposit,
      goal:                   teamStats.goal,
      achieved:               teamStats.achieved,
      remaining:              teamStats.remaining,
      completionPercent:      teamStats.completionPercent,
      totalDeposits:          teamStats.totalDeposits
    },
    agents: arr.map(function(a) {
      return {
        code:          a.code,
        name:          a.name,
        target:        safeNum_(a.target),
        leads:         a.leads,
        ftd:           a.ftd,
        additional:    a.additional,
        stdCount:      a.stdCount,
        stdAmount:     safeNum_(a.stdAmount),
        totalDeposits: a.totalDeposits,
        depositAmount: safeNum_(a.depositAmount),
        averageDeposit:safeNum_(a.averageDeposit),
        goalPercent:   safeNum_(a.goalPercent)
      };
    }),
    rankings: rankings,
    config: {
      noTargetsConfigured: teamGoal === 0
        ? 'No targets configured — set values in the Targets sheet.' : null,
      noDepositsInPeriod: teamStats.totalDeposits === 0
        ? 'No deposits found for this period.' : null
    }
  };
}

/*********************************************************
 * AUDIT
 *********************************************************/

function writeAudit(agentCode, action, clientId) {
  if (!agentCode || !action) return;  // silently skip corrupt calls
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUDIT);
  sheet.appendRow([new Date(), agentCode, action, String(clientId || '')]);
}

/*********************************************************
 * HELPERS - GENERATORS
 *********************************************************/

function generateLeadId()    { return 'L-' + Utilities.getUuid(); }
function generateDepositId() { return 'D-' + Utilities.getUuid(); }

/*********************************************************
 * HELPERS - TEXT NORMALISATION
 *********************************************************/

function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/*********************************************************
 * AGENT URL GENERATOR
 *********************************************************/

function generateAgentUrls() {
  const BASE_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';  // <-- replace with your deployment URL
  const sheet    = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AGENTS);
  const lastRow  = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const urls = data.map(function(row) {
    const isActive = row[3] === true || String(row[3]).trim().toUpperCase() === 'TRUE';
    if (!isActive) return [''];   // leave cell blank for inactive agents
    return [
      BASE_URL +
      '?agent=' + encodeURIComponent(row[0]) +
      '&t='     + encodeURIComponent(row[2])
    ];
  });
  sheet.getRange(2, 5, urls.length, 1).setValues(urls);
}

/*********************************************************
 * TEST HELPERS
 *********************************************************/

function testFind()   { Logger.log(JSON.stringify(findClient('1'))); }
function testSearch() { Logger.log(JSON.stringify(searchClients('cli'))); }

function testManagerDashboard() {
  const now = new Date();
  Logger.log(JSON.stringify(getManagerDashboard(now.getFullYear(), now.getMonth())));
}

function testManagerDashboardAllTime() {
  Logger.log(JSON.stringify(getManagerDashboard(0, -1)));
}
