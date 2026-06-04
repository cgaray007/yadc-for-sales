/*********************************************************
 * CONFIG
 *********************************************************/

const SHEETS = {
  AGENTS:   'Agents',
  LEADS:    'Leads',
  DEPOSITS: 'Deposits',
  AUDIT:    'AuditLog'
};

/*********************************************************
 * WEB APP
 *********************************************************/

function doGet(e) {
  const agent = e.parameter.agent || '';
  const token = e.parameter.t     || '';

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
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

/*********************************************************
 * INITIALIZATION
 *********************************************************/

function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createAgentsSheet_(ss);
  createLeadsSheet_(ss);
  createDepositsSheet_(ss);
  createAuditLogSheet_(ss);
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
    ['AG001','João',  '9x8JkP2', true, ''],
    ['AG002','Maria', 'Q4LmT91', true, ''],
    ['AG003','Pedro', 'K7NpX55', true, '']
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
    'Campaign',
    'CreatedAt'
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

/*********************************************************
 * AGENT VALIDATION
 *********************************************************/

function validateAgent(agentCode, token) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.AGENTS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      String(row[0]).trim() === String(agentCode).trim() &&
      String(row[2]).trim() === String(token).trim() &&
      row[3] === true
    ) {
      return { valid: true, agentName: row[1] };
    }
  }

  return { valid: false };
}

/*********************************************************
 * HELPERS — ID MATCHING
 *********************************************************/

function idsMatch_(sheetVal, inputVal) {
  const a = String(sheetVal).trim();
  const b = String(inputVal).trim();
  return a === b || sheetVal == inputVal;
}

/*********************************************************
 * LEADS
 *********************************************************/

function createLead(payload) {
  payload.clientId = normalizeText(payload.clientId);
  payload.fullName = normalizeText(payload.fullName);

  if (!payload.clientId) throw new Error('Client ID obrigatório');
  if (!payload.fullName)  throw new Error('Nome completo obrigatório');

  if (leadExists(payload.clientId)) {
    throw new Error('Client ID já cadastrado: ' + payload.clientId);
  }

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.LEADS);

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
    '',           // Campaign — left blank, filled by hand
    new Date()
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 2).setNumberFormat('@');

  writeAudit(payload.agentCode, 'CREATE_LEAD', payload.clientId);

  return { success: true, leadId: leadId };
}

function leadExists(clientId) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.LEADS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (idsMatch_(data[i][1], clientId)) return true;
  }

  return false;
}

/*********************************************************
 * CLIENT SEARCH — exact match by ID
 *********************************************************/

function findClient(clientId) {
  clientId = String(clientId).trim();

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.LEADS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (idsMatch_(row[1], clientId)) {
      return {
        found:                true,
        leadId:               String(row[0]),
        clientId:             String(row[1]),
        fullName:             String(row[2]),
        agentCode:            String(row[3]),
        leadDate:             row[4] ? new Date(row[4]).toISOString() : '',  // FIX: serialize Date
        investmentExperience: String(row[5])
      };
    }
  }

  return { found: false };
}

/*********************************************************
 * CLIENT SEARCH — fuzzy / autocomplete (by ID or name)
 *********************************************************/

function searchClients(query) {
  query = String(query).trim().toLowerCase();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.LEADS);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

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
        leadDate:             row[4] ? new Date(row[4]).toISOString() : '',  // FIX: serialize Date
        investmentExperience: String(row[5] || '')
      });
    }

    if (results.length >= 8) break;
  }

  return results;
}

/*********************************************************
 * DEPOSITS
 *********************************************************/

function addDeposit(payload) {
  const client = findClient(payload.clientId);

  if (!client.found) {
    throw new Error('Cliente não encontrado: ' + payload.clientId);
  }

  const depositType = hasFTD(payload.clientId) ? 'ADDITIONAL' : 'FTD';

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.DEPOSITS);

  const depositId = generateDepositId();

  sheet.appendRow([
    depositId,
    String(payload.clientId),
    payload.depositDate,
    Number(payload.amount),
    depositType,
    payload.agentCode,
    new Date()
  ]);

  writeAudit(payload.agentCode, 'ADD_DEPOSIT', payload.clientId);

  return {
    success:     true,
    depositType: depositType,
    depositId:   depositId
  };
}

function hasFTD(clientId) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.DEPOSITS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (idsMatch_(data[i][1], clientId) && data[i][4] === 'FTD') {
      return true;
    }
  }

  return false;
}

function getMyDeposits(agentCode) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.DEPOSITS);

  const data  = sheet.getDataRange().getValues();
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  let totalAmount = 0;
  let countFTD    = 0;
  let countAdd    = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[5]).trim() !== String(agentCode).trim()) continue;

    const d = new Date(row[2]);
    if (d.getMonth() !== month || d.getFullYear() !== year) continue;

    const amount = Number(row[3]) || 0;
    const type   = String(row[4]).trim();

    totalAmount += amount;
    if (type === 'FTD')        countFTD++;
    else if (type === 'ADDITIONAL') countAdd++;
  }

  return {
    month:       now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    totalAmount: totalAmount,
    countFTD:    countFTD,
    countAdd:    countAdd,
    total:       countFTD + countAdd
  };
}
/*********************************************************
 * AUDIT
 *********************************************************/

function writeAudit(agentCode, action, clientId) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEETS.AUDIT);

  sheet.appendRow([new Date(), agentCode, action, String(clientId)]);
}

/*********************************************************
 * HELPERS — GENERATORS
 *********************************************************/

function generateLeadId() {
  return 'L-' + Utilities.getUuid();
}

function generateDepositId() {
  return 'D-' + Utilities.getUuid();
}

/*********************************************************
 * HELPERS — TEXT NORMALISATION
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
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbyVV18OeI67em_FgQGxh8lZDWwEltzhhVX75h-b7_zm2zjGjhqXo4dLuw-D-cRnjuQtQQ/exec';
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Agents');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const urls = data.map(function(row) {
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

function testFind() {
  Logger.log(JSON.stringify(findClient('1')));
}

function testSearch() {
  Logger.log(JSON.stringify(searchClients('cli')));
}

function testSearchDebug() {
  const queries = ['por', 'ped', 'joão', 'maria', 'cli', '1'];
  queries.forEach(function(q) {
    const results = searchClients(q);
    Logger.log('Query: "' + q + '" -> ' + results.length + ' resultados');
    results.forEach(function(r) {
      Logger.log('  - ' + r.fullName + ' (' + r.clientId + ')');
    });
  });
}
