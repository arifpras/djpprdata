import {
  findDateColumn,
  getSqliteDb,
  getTableColumns,
  isNumericColumn,
  quoteSqlIdentifier,
} from "@/app/api/utils/sqlite";

const TABLE_NAME = "tenor_phei";
const MAX_SELECTED_DATES = 4;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseDateValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return Number.NaN;
  }
  const value = String(rawValue).trim();
  if (!value) {
    return Number.NaN;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return date.getTime();
}

function findReferenceDate(dateInfos, targetTimeMs, lookbackDays) {
  if (!Number.isFinite(targetTimeMs)) {
    return null;
  }

  let thresholdMs = targetTimeMs;
  if (lookbackDays > 1) {
    thresholdMs = targetTimeMs - lookbackDays * ONE_DAY_MS;
  }

  let match = null;
  for (const dateInfo of dateInfos) {
    if (lookbackDays === 1) {
      if (dateInfo.timeMs < targetTimeMs) {
        match = dateInfo;
      } else {
        break;
      }
      continue;
    }

    if (dateInfo.timeMs <= thresholdMs) {
      match = dateInfo;
    } else {
      break;
    }
  }

  return match ? match.raw : null;
}

function summarizeRow(row, tenorColumns) {
  if (!row) {
    return null;
  }

  const numericPoints = tenorColumns
    .filter((tenor) => Number.isFinite(tenor.value))
    .map((tenor) => ({ tenor: tenor.value, value: Number(row[tenor.key]) }))
    .filter((point) => Number.isFinite(point.value));

  if (numericPoints.length === 0) {
    return {
      avg: Number.NaN,
      slope: Number.NaN,
      spread2s10s: Number.NaN,
    };
  }

  const avg = numericPoints.reduce((sum, point) => sum + point.value, 0) / numericPoints.length;
  const firstPoint = numericPoints[0];
  const lastPoint = numericPoints[numericPoints.length - 1];
  const slope = firstPoint && lastPoint ? lastPoint.value - firstPoint.value : Number.NaN;

  const twoYearPoint = numericPoints.find((point) => point.tenor === 2);
  const tenYearPoint = numericPoints.find((point) => point.tenor === 10);
  const spread2s10s =
    twoYearPoint && tenYearPoint ? tenYearPoint.value - twoYearPoint.value : Number.NaN;

  return {
    avg,
    slope,
    spread2s10s,
  };
}

function sortTenorColumns(columns, dateColumn) {
  return columns
    .filter((column) => column.name !== dateColumn && isNumericColumn(column))
    .map((column) => {
      const tenorValue = Number(column.name);
      return {
        key: column.name,
        label: column.name,
        value: Number.isFinite(tenorValue) ? tenorValue : null,
      };
    })
    .sort((left, right) => {
      if (left.value === null && right.value === null) {
        return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
      }
      if (left.value === null) {
        return 1;
      }
      if (right.value === null) {
        return -1;
      }
      return left.value - right.value;
    });
}

export async function GET(request) {
  try {
    const db = getSqliteDb();
    const columns = getTableColumns(db, TABLE_NAME);
    const dateColumn = findDateColumn(columns);

    if (!dateColumn) {
      return Response.json({ error: "Date column not found in tenor_phei." }, { status: 400 });
    }

    const tenorColumns = sortTenorColumns(columns, dateColumn);
    if (tenorColumns.length === 0) {
      return Response.json({ error: "No tenor columns available in tenor_phei." }, { status: 400 });
    }

    const tableSql = quoteSqlIdentifier(TABLE_NAME);
    const dateSql = quoteSqlIdentifier(dateColumn);

    const availableDateRows = db
      .prepare(
        `
          SELECT ${dateSql} AS date
          FROM ${tableSql}
          WHERE ${dateSql} IS NOT NULL
          ORDER BY ${dateSql} DESC
        `,
      )
      .all();

    const availableDates = availableDateRows.map((row) => String(row.date));

    const availableDateInfos = availableDates
      .map((rawDate) => ({ raw: rawDate, timeMs: parseDateValue(rawDate) }))
      .filter((dateInfo) => Number.isFinite(dateInfo.timeMs))
      .sort((left, right) => left.timeMs - right.timeMs);
    const dateTimeByRaw = new Map(availableDateInfos.map((dateInfo) => [dateInfo.raw, dateInfo.timeMs]));

    const { searchParams } = new URL(request.url);
    const requestedDates = [
      ...searchParams.getAll("dates"),
      ...(searchParams.get("datesCsv") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ];

    const selectedDateSet = new Set();
    for (const date of requestedDates) {
      if (!availableDates.includes(date)) {
        continue;
      }
      selectedDateSet.add(date);
    }

    let selectedDates = [...selectedDateSet]
      .sort((left, right) => availableDates.indexOf(left) - availableDates.indexOf(right))
      .slice(0, MAX_SELECTED_DATES);

    if (selectedDates.length === 0) {
      const latestDate = availableDates[0] || null;
      if (latestDate) {
        const latestTimeMs = dateTimeByRaw.get(latestDate);
        const defaultCandidates = [
          latestDate,
          findReferenceDate(availableDateInfos, latestTimeMs, 1),
          findReferenceDate(availableDateInfos, latestTimeMs, 30),
          findReferenceDate(availableDateInfos, latestTimeMs, 365),
        ].filter(Boolean);

        const uniqueDefaults = [];
        for (const candidate of defaultCandidates) {
          if (!uniqueDefaults.includes(candidate)) {
            uniqueDefaults.push(candidate);
          }
        }

        if (uniqueDefaults.length < MAX_SELECTED_DATES) {
          for (const date of availableDates) {
            if (!uniqueDefaults.includes(date)) {
              uniqueDefaults.push(date);
            }
            if (uniqueDefaults.length >= MAX_SELECTED_DATES) {
              break;
            }
          }
        }

        selectedDates = uniqueDefaults.slice(0, MAX_SELECTED_DATES);
      }
    }

    if (selectedDates.length === 0) {
      return Response.json({
        availableDates,
        selectedDates: [],
        tenors: tenorColumns,
        series: [],
      });
    }

    const lookbackDatesBySelectedDate = new Map();
    for (const selectedDate of selectedDates) {
      const selectedTimeMs = dateTimeByRaw.get(selectedDate);
      const previousDay = findReferenceDate(availableDateInfos, selectedTimeMs, 1);
      const previous30Days = findReferenceDate(availableDateInfos, selectedTimeMs, 30);
      const previousYear = findReferenceDate(availableDateInfos, selectedTimeMs, 365);

      lookbackDatesBySelectedDate.set(selectedDate, {
        previousDay,
        previous30Days,
        previousYear,
      });
    }

    const rowDatesToFetch = new Set(selectedDates);
    for (const lookbackDates of lookbackDatesBySelectedDate.values()) {
      Object.values(lookbackDates)
        .filter(Boolean)
        .forEach((date) => rowDatesToFetch.add(date));
    }

    const queryDates = [...rowDatesToFetch];

    const tenorSelectSql = tenorColumns
      .map((tenor) => `CAST(${quoteSqlIdentifier(tenor.key)} AS REAL) AS ${quoteSqlIdentifier(tenor.key)}`)
      .join(",\n            ");
    const placeholders = queryDates.map(() => "?").join(",");

    const rows = db
      .prepare(
        `
          SELECT
            ${dateSql} AS date,
            ${tenorSelectSql}
          FROM ${tableSql}
          WHERE ${dateSql} IN (${placeholders})
        `,
      )
      .all(...queryDates);

    const byDate = new Map(rows.map((row) => [String(row.date), row]));

    const series = selectedDates
      .map((date) => {
        const row = byDate.get(date);
        if (!row) {
          return null;
        }

        return {
          date,
          points: tenorColumns
            .map((tenor) => ({
              tenor: tenor.value,
              label: tenor.label,
              value: Number(row[tenor.key]),
            }))
            .filter((point) => Number.isFinite(point.value)),
        };
      })
      .filter(Boolean);

    const comparisons = {};
    for (const selectedDate of selectedDates) {
      const selectedSummary = summarizeRow(byDate.get(selectedDate), tenorColumns);
      const lookbackDates = lookbackDatesBySelectedDate.get(selectedDate) || {};

      const buildComparisonBlock = (referenceDate) => {
        if (!referenceDate) {
          return null;
        }

        const referenceSummary = summarizeRow(byDate.get(referenceDate), tenorColumns);
        if (!selectedSummary || !referenceSummary) {
          return {
            date: referenceDate,
            metrics: referenceSummary,
            delta: null,
          };
        }

        return {
          date: referenceDate,
          metrics: referenceSummary,
          delta: {
            avg: selectedSummary.avg - referenceSummary.avg,
            slope: selectedSummary.slope - referenceSummary.slope,
            spread2s10s: selectedSummary.spread2s10s - referenceSummary.spread2s10s,
          },
        };
      };

      comparisons[selectedDate] = {
        previousDay: buildComparisonBlock(lookbackDates.previousDay),
        previous30Days: buildComparisonBlock(lookbackDates.previous30Days),
        previousYear: buildComparisonBlock(lookbackDates.previousYear),
      };
    }

    return Response.json({
      availableDates,
      selectedDates,
      tenors: tenorColumns,
      series,
      comparisons,
      maxSelectedDates: MAX_SELECTED_DATES,
    });
  } catch (error) {
    console.error("Error fetching yield curve data:", error);
    return Response.json({ error: "Failed to fetch yield curve data." }, { status: 500 });
  }
}
