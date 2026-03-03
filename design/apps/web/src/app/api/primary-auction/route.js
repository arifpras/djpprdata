import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const REQUIRED_COLUMNS = [
  "tanggal_lelang_pricing",
  "code",
  "total_penawaran",
  "way_incoming",
  "owners_estimate",
  "way_awarded",
  "total_penawaran_diterima",
];

function parseDateValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return Number.NaN;
  }
  const value = String(rawValue).trim();
  if (!value) {
    return Number.NaN;
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value);

  return parsed.getTime();
}

function parseNumericValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const value = String(rawValue).trim();
  if (!value) {
    return null;
  }

  const normalized = value.replaceAll(",", "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function getAuctionCsvPath() {
  const configuredPath = process.env.PRIMARY_AUCTION_CSV_PATH;
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  const absoluteWorkspacePath = "/Users/arifpras/Library/CloudStorage/Dropbox/perisai/dashboard/data/realisasipenerbitan_cleaned.csv";
  if (fs.existsSync(absoluteWorkspacePath)) {
    return absoluteWorkspacePath;
  }

  const fallbackRelativePath = path.join(process.cwd(), "..", "..", "..", "data", "realisasipenerbitan_cleaned.csv");
  if (fs.existsSync(fallbackRelativePath)) {
    return fallbackRelativePath;
  }

  return absoluteWorkspacePath;
}

export async function GET() {
  try {
    const csvPath = getAuctionCsvPath();
    if (!fs.existsSync(csvPath)) {
      return Response.json(
        { error: "Primary auction CSV file not found." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const csvRaw = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(csvRaw, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      return Response.json(
        { error: "Failed to parse primary auction CSV." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const rows = (parsed.data || [])
      .map((row) => {
        const pricingDate = String(row.tanggal_lelang_pricing || "").trim();
        const code = String(row.code || "").trim();
        const pricingDateMs = parseDateValue(pricingDate);

        if (!pricingDate || !code || !Number.isFinite(pricingDateMs)) {
          return null;
        }

        return {
          tanggal_lelang_pricing: pricingDate,
          code,
          total_penawaran: parseNumericValue(row.total_penawaran),
          way_incoming: parseNumericValue(row.way_incoming),
          owners_estimate: parseNumericValue(row.owners_estimate),
          way_awarded: parseNumericValue(row.way_awarded),
          total_penawaran_diterima: parseNumericValue(row.total_penawaran_diterima),
          pricingDateMs,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.pricingDateMs - left.pricingDateMs)
      .map(({ pricingDateMs, ...safeRow }) => safeRow);

    const codeSeries = {};
    for (const row of rows) {
      if (!codeSeries[row.code]) {
        codeSeries[row.code] = [];
      }
      codeSeries[row.code].push({
        tanggal_lelang_pricing: row.tanggal_lelang_pricing,
        owners_estimate: row.owners_estimate,
      });
    }

    Object.values(codeSeries).forEach((seriesRows) => {
      seriesRows.sort(
        (left, right) => parseDateValue(left.tanggal_lelang_pricing) - parseDateValue(right.tanggal_lelang_pricing),
      );
    });

    const codes = [...new Set(rows.map((row) => row.code))];

    return Response.json(
      {
        columns: REQUIRED_COLUMNS,
        rows,
        codes,
        codeSeries,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load primary auction data:", error);
    return Response.json(
      { error: "Failed to load primary auction data." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
