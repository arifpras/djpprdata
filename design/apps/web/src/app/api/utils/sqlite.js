import Database from "better-sqlite3";

const DEFAULT_SQLITE_PATH =
  "/Users/arifpras/Library/CloudStorage/Dropbox/perisai/dashboard/data/Database_Domestik_Internasional.db";

let db;

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function getSqliteDb() {
  if (db) {
    return db;
  }

  const filePath = process.env.SQLITE_DB_PATH || DEFAULT_SQLITE_PATH;
  db = new Database(filePath, { readonly: true, fileMustExist: true });
  return db;
}

export function parseVariableId(variableId) {
  const raw = String(variableId || "");
  const [tableName, columnName] = raw.split("::");
  if (!tableName || !columnName) {
    return null;
  }

  return {
    tableName,
    columnName,
  };
}

export function findDateColumn(columns) {
  const preferred = columns.find(
    (column) => String(column.name).toLowerCase() === "tanggal",
  );

  if (preferred) {
    return preferred.name;
  }

  return columns[0]?.name || null;
}

export function getTableColumns(dbInstance, tableName) {
  const pragmaSql = `PRAGMA table_info(${quoteIdentifier(tableName)})`;
  return dbInstance.prepare(pragmaSql).all();
}

export function isNumericColumn(column) {
  const type = String(column.type || "").toUpperCase();
  return (
    type.includes("INT") ||
    type.includes("REAL") ||
    type.includes("NUM") ||
    type.includes("FLOAT") ||
    type.includes("DOUBLE") ||
    type.includes("DEC")
  );
}

export function quoteSqlIdentifier(identifier) {
  return quoteIdentifier(identifier);
}

function toTitleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function humanizeIdentifier(value) {
  return toTitleCase(
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\bCT\b/g, "CT")
      .replace(/\bUST\b/g, "UST")
      .replace(/\bCDS\b/g, "CDS")
      .replace(/\bNDF\b/g, "NDF")
      .trim(),
  );
}

export function buildIndicatorDisplayName(tableName, columnName) {
  const cleanTable = humanizeIdentifier(tableName);
  const cleanColumn = humanizeIdentifier(columnName)
    .replace(/^Yield\s+/i, "");

  if (cleanColumn.toLowerCase() === cleanTable.toLowerCase()) {
    return cleanColumn;
  }

  return `${cleanTable} • ${cleanColumn}`;
}

const COUNTRY_MAP = {
  BRA: "Brazil",
  CHIL: "Chile",
  COL: "Colombia",
  INDO: "Indonesia",
  MEX: "Mexico",
  PHIL: "Philippines",
  TUR: "Turkey",
  UKR: "Ukraine",
  ZA: "South Africa",
  SOAF: "South Africa",
  KSA: "Saudi Arabia",
  US: "United States",
  USA: "United States",
};

const MONTH_MAP = {
  JAN: "Jan",
  FEB: "Feb",
  MAR: "Mar",
  APR: "Apr",
  MAY: "May",
  JUN: "Jun",
  JUL: "Jul",
  AUG: "Aug",
  SEP: "Sep",
  OCT: "Oct",
  OKT: "Oct",
  NOV: "Nov",
  DEC: "Dec",
};

function detectFamily(tableName) {
  const table = String(tableName || "").toUpperCase();
  if (table.includes("CDS")) return "CDS";
  if (table.includes("KURS") || table.includes("VALAS") || table.includes("NDF")) return "FX";
  if (table.includes("SAHAM")) return "Equity";
  if (table.includes("DXY") || table.includes("VIX") || table.includes("INDEX")) return "Market Index";
  if (table.includes("UST") || table.includes("CT") || table.includes("10Y") || table.includes("30Y")) return "Rates";
  return "Macro";
}

function detectMetric(columnName) {
  const column = String(columnName || "");
  if (/^Yield_/i.test(column)) return "Yield";
  if (/^Spread_/i.test(column)) return "Spread";
  if (/CDS/i.test(column)) return "CDS Level";
  if (/Index/i.test(column)) return "Index Level";
  if (/Curncy|Kurs|Valas|NDF/i.test(column)) return "FX Level";
  if (/Saham/i.test(column)) return "Equity Level";
  return "Indicator Level";
}

function extractTenor(tableName, columnName) {
  const source = `${tableName}_${columnName}`.toUpperCase();
  const tenorMatch = source.match(/\b(\d{1,2}Y|\d{1,2}M)\b/);
  return tenorMatch ? tenorMatch[1] : null;
}

function extractMaturity(columnName) {
  const source = String(columnName || "").toUpperCase();
  const match = source.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|OKT|NOV|DEC)_(\d{2})\b/);
  if (!match) return null;
  const month = MONTH_MAP[match[1]] || match[1];
  const year = `20${match[2]}`;
  return `${month} ${year}`;
}

function extractEntities(tableName, columnName) {
  const tokens = `${tableName}_${columnName}`
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  const entities = [];
  for (const token of tokens) {
    if (COUNTRY_MAP[token] && !entities.includes(COUNTRY_MAP[token])) {
      entities.push(COUNTRY_MAP[token]);
    }
  }

  return entities;
}

function detectScope(tableName, entities) {
  const table = String(tableName || "").toUpperCase();
  if (table.includes("PEERS")) return "Peer Group";
  if (table.includes("GENERAL")) return "Global / Mixed";
  if (table.includes("INDO") || entities.includes("Indonesia")) return "Domestic / Indonesia-centric";
  if (entities.length > 1) return "Cross-country";
  if (entities.length === 1) return "Country-specific";
  return "Global / Mixed";
}

export function parseIndicatorMeta(tableName, columnName) {
  const family = detectFamily(tableName);
  const metric = detectMetric(columnName);
  const tenor = extractTenor(tableName, columnName);
  const maturity = extractMaturity(columnName);
  const entities = extractEntities(tableName, columnName);
  const scope = detectScope(tableName, entities);

  let confidence = "Medium";
  if (entities.length > 0 || tenor || maturity) {
    confidence = "High";
  }

  return {
    family,
    metric,
    tenor,
    maturity,
    entities,
    scope,
    confidence,
  };
}

export function buildIndicatorDescription(tableName, columnName) {
  const source = humanizeIdentifier(tableName);
  const meta = parseIndicatorMeta(tableName, columnName);
  const entityPart =
    meta.entities.length > 0
      ? `Entities: ${meta.entities.join(", ")}.`
      : "Entities inferred from naming tokens; may represent broader market scope.";
  const tenorPart = meta.tenor ? ` Tenor: ${meta.tenor}.` : "";
  const maturityPart = meta.maturity ? ` Maturity tag: ${meta.maturity}.` : "";

  return `${meta.metric} series in the ${meta.family} family from ${source}. Scope: ${meta.scope}.${tenorPart}${maturityPart} ${entityPart} Confidence: ${meta.confidence}.`;
}