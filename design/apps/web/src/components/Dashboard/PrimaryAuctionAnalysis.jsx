import React from "react";
import { Copy, Download } from "lucide-react";

const SERIES_COLORS_DARK = ["#9b5de5", "#ef476f", "#ffd166", "#06d6a0", "#4cc9f0", "#f3722c"];
const SERIES_COLORS_LIGHT = ["#9b5de5", "#f28482", "#84a59d", "#577590", "#f6bd60", "#3a86ff"];
const TIME_FILTERS = ["All Time", "30 Days", "Year", "Year to Date", "Month to Date"];
const X_AXIS_PADDING_RATIO = 0.04;
const EXPORT_RATIO_MAP = {
  "16:9": [16, 9],
  "4:3": [4, 3],
  "3:2": [3, 2],
  "2:1": [2, 1],
  "1:1": [1, 1],
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_FORMATTER_SHORT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
});

function parseDateValue(rawValue) {
  if (!rawValue) {
    return Number.NaN;
  }
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
    ? new Date(`${rawValue}T00:00:00Z`)
    : new Date(rawValue);
  return parsed.getTime();
}

function formatDateLabel(rawValue) {
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }
  return DATE_FORMATTER.format(date);
}

function formatDateLabelShort(rawValue) {
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }
  return DATE_FORMATTER_SHORT.format(date);
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPercent(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

function formatSignedPercentagePoints(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)} pp`;
}

function formatPercentagePoints(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(digits)} pp`;
}

function formatBillionsFromMillions(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  const billionsValue = value / 1000;
  return billionsValue.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function toBase64Utf8(value) {
  return window.btoa(unescape(encodeURIComponent(value)));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function getPeriodStartMs(selectedPeriod, latestDateMs) {
  if (!Number.isFinite(latestDateMs)) {
    return Number.NEGATIVE_INFINITY;
  }

  if (selectedPeriod === "30 Days") {
    return latestDateMs - 30 * 24 * 60 * 60 * 1000;
  }

  if (selectedPeriod === "Year") {
    return latestDateMs - 365 * 24 * 60 * 60 * 1000;
  }

  const latestDate = new Date(latestDateMs);

  if (selectedPeriod === "Year to Date") {
    return Date.UTC(latestDate.getUTCFullYear(), 0, 1);
  }

  if (selectedPeriod === "Month to Date") {
    return Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 1);
  }

  return Number.NEGATIVE_INFINITY;
}

function toInstrumentLabel(codeValue) {
  const code = String(codeValue || "").trim().toLowerCase();
  if (!code) {
    return "-";
  }

  const bmMatch = code.match(/^bm(\d{2})$/i);
  if (bmMatch) {
    return `FR ${bmMatch[1]}Y`;
  }

  const spnMatch = code.match(/^spn(\d{2})m$/i);
  if (spnMatch) {
    return `SPN ${spnMatch[1]}M`;
  }

  const sdgMatch = code.match(/^sdg(\d{2})$/i);
  if (sdgMatch) {
    return `SDG ${sdgMatch[1]}Y`;
  }

  return code.toUpperCase();
}

function parseSeriesMeta(codeValue) {
  const code = String(codeValue || "").trim().toLowerCase();
  if (!code) {
    return { family: "other", rank: 99, tenor: Number.POSITIVE_INFINITY };
  }

  const spnMatch = code.match(/^spn(\d{2})m$/i);
  if (spnMatch) {
    return {
      family: "spn",
      rank: 0,
      tenor: Number(spnMatch[1]),
    };
  }

  const frMatch = code.match(/^bm(\d{2})$/i);
  if (frMatch) {
    return {
      family: "fr",
      rank: 1,
      tenor: Number(frMatch[1]),
    };
  }

  const sdgMatch = code.match(/^sdg(\d{2})$/i);
  if (sdgMatch) {
    return {
      family: "sdg",
      rank: 2,
      tenor: Number(sdgMatch[1]),
    };
  }

  return { family: "other", rank: 3, tenor: Number.POSITIVE_INFINITY };
}

function compareSeriesCode(leftCode, rightCode) {
  const leftMeta = parseSeriesMeta(leftCode);
  const rightMeta = parseSeriesMeta(rightCode);

  if (leftMeta.rank !== rightMeta.rank) {
    return leftMeta.rank - rightMeta.rank;
  }

  if (leftMeta.tenor !== rightMeta.tenor) {
    return leftMeta.tenor - rightMeta.tenor;
  }

  return String(leftCode).localeCompare(String(rightCode), undefined, { sensitivity: "base" });
}

function buildSeriesPath(points, xScale, yScale) {
  if (!Array.isArray(points) || points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = xScale(point.xIndex);
      const y = yScale(point.owners_estimate);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function PrimaryAuctionAnalysis({ theme = "light" }) {
  const chartSvgRef = React.useRef(null);
  const [rows, setRows] = React.useState([]);
  const [codes, setCodes] = React.useState([]);
  const [codeSeries, setCodeSeries] = React.useState({});
  const [selectedCodes, setSelectedCodes] = React.useState([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState("Year");
  const [chartStyle, setChartStyle] = React.useState("point");
  const [exportFileType, setExportFileType] = React.useState("png");
  const [exportRatio, setExportRatio] = React.useState("16:9");
  const [copyFeedback, setCopyFeedback] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const loadAuctionData = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/primary-auction?t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load primary auction data");
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        const nextRows = Array.isArray(payload.rows) ? payload.rows : [];
        const nextCodes = Array.isArray(payload.codes) ? payload.codes : [];
        const nextCodeSeries = payload.codeSeries || {};

        setRows(nextRows);
        setCodes(nextCodes);
        setCodeSeries(nextCodeSeries);
        setSelectedCodes((current) => {
          if (current.length > 0) {
            return current.filter((code) => nextCodes.includes(code)).slice(0, 4);
          }

          const preferredDefaults = ["bm05", "bm10", "bm15", "bm20"].filter((code) => nextCodes.includes(code));
          if (preferredDefaults.length > 0) {
            const fallbackCodes = [...nextCodes]
              .sort(compareSeriesCode)
              .filter((code) => !preferredDefaults.includes(code));
            return [...preferredDefaults, ...fallbackCodes].slice(0, 4);
          }

          return [...nextCodes].sort(compareSeriesCode).slice(0, 4);
        });
      } catch (loadError) {
        if (active) {
          setError("Failed to load primary market auction data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAuctionData();

    return () => {
      active = false;
    };
  }, []);

  const palette =
    theme === "dark"
      ? {
          cardBg: "#0F1117",
          border: "#21262D",
          title: "#F0F6FC",
          text: "#C9D1D9",
          subText: "#8B949E",
          mutedBg: "#161B22",
          axis: "#F0F6FC",
          grid: "#2D333B",
          selectorBg: "#1B1D24",
          selectorText: "#C9D1D9",
          selectorActiveBg: "#2962FF",
          selectorActiveText: "#FFFFFF",
          chipBg: "#242831",
          chipText: "#C6CBD7",
          chipHover: "#303540",
          buttonBorder: "#3A3D47",
          buttonText: "#C3C8D4",
          buttonHover: "#E8EAF0",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          title: "#1A1A1A",
          text: "#30343F",
          subText: "#6B7280",
          mutedBg: "#F8F9FC",
          axis: "#0D1117",
          grid: "#E5E7EB",
          selectorBg: "#FFFFFF",
          selectorText: "#30343F",
          selectorActiveBg: "#2962FF",
          selectorActiveText: "#FFFFFF",
          chipBg: "#F5F6F9",
          chipText: "#4B4E59",
          chipHover: "#E4E6EB",
          buttonBorder: "#D0D3DA",
          buttonText: "#4B4E59",
          buttonHover: "#1A1A1A",
        };

  const seriesColors = theme === "dark" ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT;

  const latestDateMs = React.useMemo(() => {
    if (rows.length === 0) {
      return Number.NaN;
    }
    return Math.max(...rows.map((row) => parseDateValue(row.tanggal_lelang_pricing)).filter(Number.isFinite));
  }, [rows]);

  const periodStartMs = React.useMemo(() => getPeriodStartMs(selectedPeriod, latestDateMs), [selectedPeriod, latestDateMs]);

  const selectedSeries = selectedCodes
    .map((code) => ({
      code,
      points: (codeSeries[code] || [])
        .map((point) => ({
          ...point,
          timeMs: parseDateValue(point.tanggal_lelang_pricing),
        }))
        .filter((point) => Number.isFinite(point.timeMs) && Number.isFinite(point.owners_estimate))
        .filter((point) => point.timeMs >= periodStartMs),
    }))
    .filter((item) => item.points.length > 0)
    .sort((left, right) => compareSeriesCode(left.code, right.code));

  const orderedCodes = React.useMemo(() => {
    return [...codes].sort(compareSeriesCode);
  }, [codes]);

  const sortedRows = React.useMemo(() => {
    return [...rows]
      .filter((row) => parseDateValue(row.tanggal_lelang_pricing) >= periodStartMs)
      .sort((left, right) => {
      const dateDiff = parseDateValue(right.tanggal_lelang_pricing) - parseDateValue(left.tanggal_lelang_pricing);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return compareSeriesCode(left.code, right.code);
    });
  }, [rows, periodStartMs]);

  const chartDateLabels = React.useMemo(() => {
    return [...new Set(sortedRows.map((row) => row.tanggal_lelang_pricing))]
      .sort((left, right) => parseDateValue(left) - parseDateValue(right));
  }, [sortedRows]);

  const chartDateIndexMap = React.useMemo(() => {
    return new Map(chartDateLabels.map((date, index) => [date, index]));
  }, [chartDateLabels]);

  const chartSeries = React.useMemo(() => {
    return selectedSeries
      .map((seriesItem) => ({
        ...seriesItem,
        points: seriesItem.points
          .filter((point) => chartDateIndexMap.has(point.tanggal_lelang_pricing))
          .map((point) => ({
            ...point,
            xIndex: chartDateIndexMap.get(point.tanggal_lelang_pricing),
          }))
          .sort((left, right) => left.xIndex - right.xIndex),
      }))
      .filter((seriesItem) => seriesItem.points.length > 0);
  }, [selectedSeries, chartDateIndexMap]);

  const allPoints = chartSeries.flatMap((item) => item.points);
  const hasChartData = allPoints.length > 0;

  const width = 1000;
  const height = 240;
  const margin = { top: 8, right: 20, bottom: 24, left: 68 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const minX = hasChartData ? Math.min(...allPoints.map((point) => point.xIndex)) : 0;
  const maxX = hasChartData ? Math.max(...allPoints.map((point) => point.xIndex)) : 1;
  const xDomainPadding = hasChartData ? Math.max((maxX - minX) * X_AXIS_PADDING_RATIO, 0.5) : 0;
  const minXDomain = minX - xDomainPadding;
  const maxXDomain = maxX + xDomainPadding;
  const minYRaw = hasChartData ? Math.min(...allPoints.map((point) => point.owners_estimate)) : 0;
  const maxYRaw = hasChartData ? Math.max(...allPoints.map((point) => point.owners_estimate)) : 1;
  const yPadding = Math.max((maxYRaw - minYRaw) * 0.08, 0.001);
  const minY = minYRaw - yPadding;
  const maxY = maxYRaw + yPadding;

  const xScale = (value) => {
    if (maxXDomain === minXDomain) {
      return margin.left + innerWidth / 2;
    }
    return margin.left + ((value - minXDomain) / (maxXDomain - minXDomain)) * innerWidth;
  };

  const yScale = (value) => {
    if (maxY === minY) {
      return margin.top + innerHeight / 2;
    }
    return margin.top + ((maxY - value) / (maxY - minY)) * innerHeight;
  };

  const yTicks = Array.from({ length: 5 }, (_, index) => maxY - (index / 4) * (maxY - minY));
  const xTickDateIndices = React.useMemo(() => {
    if (chartDateLabels.length === 0) {
      return [];
    }

    const maxLabels =
      selectedPeriod === "All Time"
        ? 6
        : selectedPeriod === "30 Days"
          ? 10
          : selectedPeriod === "Month to Date"
            ? 9
            : 8;
    const step = chartDateLabels.length > maxLabels ? Math.ceil(chartDateLabels.length / maxLabels) : 1;
    return chartDateLabels
      .map((date, index) => ({ date, index }))
      .filter((item, index) => index % step === 0 || index === chartDateLabels.length - 1);
  }, [chartDateLabels, selectedPeriod]);

  const cfaNarrationItems = React.useMemo(() => {
    if (sortedRows.length === 0 || chartSeries.length === 0) {
      return [];
    }

    const selectedCodeSet = new Set(chartSeries.map((item) => item.code));
    const selectedRowsOnly = sortedRows.filter((row) => selectedCodeSet.has(row.code));
    if (selectedRowsOnly.length === 0) {
      return [];
    }

    const latestDate = selectedRowsOnly[0]?.tanggal_lelang_pricing || null;
    const oldestDate = selectedRowsOnly[selectedRowsOnly.length - 1]?.tanggal_lelang_pricing || null;
    const previousDate = selectedRowsOnly.find((row) => row.tanggal_lelang_pricing !== latestDate)?.tanggal_lelang_pricing || null;

    const latestRows = latestDate
      ? selectedRowsOnly.filter((row) => row.tanggal_lelang_pricing === latestDate)
      : [];
    const previousRows = previousDate
      ? selectedRowsOnly.filter((row) => row.tanggal_lelang_pricing === previousDate)
      : [];
    const oldestRows = oldestDate
      ? selectedRowsOnly.filter((row) => row.tanggal_lelang_pricing === oldestDate)
      : [];

    const latestSelectedRows = latestRows;
    const previousSelectedRows = previousRows;
    const oldestSelectedRows = oldestRows;

    const averageFinite = (values) => {
      const validValues = values.filter(Number.isFinite);
      if (validValues.length === 0) {
        return Number.NaN;
      }
      return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
    };

    const stdDevFinite = (values) => {
      const validValues = values.filter(Number.isFinite);
      if (validValues.length <= 1) {
        return Number.NaN;
      }
      const mean = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
      const variance = validValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / validValues.length;
      return Math.sqrt(variance);
    };

    const latestOwnerAvg = averageFinite(latestSelectedRows.map((row) => row.owners_estimate));
    const previousOwnerAvg = averageFinite(previousSelectedRows.map((row) => row.owners_estimate));
    const oldestOwnerAvg = averageFinite(oldestSelectedRows.map((row) => row.owners_estimate));
    const latestOwnerStd = stdDevFinite(latestSelectedRows.map((row) => row.owners_estimate));
    const latestOwnerMin = Math.min(...latestSelectedRows.map((row) => row.owners_estimate).filter(Number.isFinite));
    const latestOwnerMax = Math.max(...latestSelectedRows.map((row) => row.owners_estimate).filter(Number.isFinite));

    const latestIncomingGap = averageFinite(
      latestSelectedRows.map((row) => {
        if (!Number.isFinite(row.way_incoming) || !Number.isFinite(row.owners_estimate)) {
          return Number.NaN;
        }
        return row.way_incoming - row.owners_estimate;
      }),
    );

    const latestAwardGap = averageFinite(
      latestSelectedRows.map((row) => {
        if (!Number.isFinite(row.way_awarded) || !Number.isFinite(row.owners_estimate)) {
          return Number.NaN;
        }
        return row.way_awarded - row.owners_estimate;
      }),
    );

    const latestConcession = averageFinite(
      latestSelectedRows.map((row) => {
        if (!Number.isFinite(row.way_awarded) || !Number.isFinite(row.way_incoming)) {
          return Number.NaN;
        }
        return row.way_awarded - row.way_incoming;
      }),
    );

    const latestBidBn = latestSelectedRows.reduce((sum, row) => sum + ((row.total_penawaran ?? 0) / 1000), 0);
    const latestAwardBn = latestSelectedRows.reduce((sum, row) => sum + ((row.total_penawaran_diterima ?? 0) / 1000), 0);
    const latestAcceptanceRatio = latestBidBn > 0 ? latestAwardBn / latestBidBn : Number.NaN;
    const latestBidAwardMultiple = latestAwardBn > 0 ? latestBidBn / latestAwardBn : Number.NaN;

    const pricingRegime =
      Number.isFinite(latestAwardGap) && latestAwardGap <= -0.001
        ? "demand-led (awards through estimate)"
        : Number.isFinite(latestAwardGap) && latestAwardGap >= 0.001
          ? "concessionary (awards above estimate)"
          : "balanced around estimate";

    const items = [];

    items.push(
      `${selectedPeriod} window level: owners estimate averages ${formatPercent(latestOwnerAvg, 2)} on ${latestDate ? formatDateLabel(latestDate) : "latest auction date"}${Number.isFinite(previousOwnerAvg) ? ` versus ${formatPercent(previousOwnerAvg, 2)} on ${formatDateLabel(previousDate)}` : ""} (${formatSignedPercentagePoints(latestOwnerAvg - previousOwnerAvg, 2)} auction-to-auction)${Number.isFinite(oldestOwnerAvg) ? ` and ${formatSignedPercentagePoints(latestOwnerAvg - oldestOwnerAvg, 2)} versus window start (${formatDateLabel(oldestDate)}).` : "."}`,
    );

    items.push(
      `Cross-series dispersion at the latest auction is ${formatPercentagePoints(latestOwnerStd, 2)} (range ${formatPercent(latestOwnerMin, 2)} to ${formatPercent(latestOwnerMax, 2)}), indicating ${Number.isFinite(latestOwnerStd) && latestOwnerStd <= 0.002 ? "tight valuation clustering" : "wider relative-value differentiation"} across selected tenors.`,
    );

    items.push(
      `Clearing dynamics are ${pricingRegime}: incoming bids are ${formatSignedPercentagePoints(latestIncomingGap, 2)} vs estimate, awards are ${formatSignedPercentagePoints(latestAwardGap, 2)} vs estimate, and the incoming-to-award concession is ${formatSignedPercentagePoints(latestConcession, 2)}.`,
    );

    items.push(
      `Allocation discipline on ${latestDate ? formatDateLabel(latestDate) : "latest date"}: total bids ${formatNumber(latestBidBn, 2)} bn, awarded ${formatNumber(latestAwardBn, 2)} bn, acceptance ratio ${formatPercent(latestAcceptanceRatio, 2)}, and bid-to-award multiple ${formatNumber(latestBidAwardMultiple, 2)}x.`,
    );

    return items;
  }, [sortedRows, chartSeries, selectedPeriod]);

  const copyQuantitativeAnalysis = async () => {
    if (!cfaNarrationItems.length) {
      return;
    }

    const copyText = [
      "Quantitative analysis",
      ...cfaNarrationItems.map((item) => `- ${item}`),
    ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setCopyFeedback("Copied");
        window.setTimeout(() => setCopyFeedback(""), 1500);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = copyText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopyFeedback("Copied");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    }
  };

  const toggleCode = (code) => {
    setSelectedCodes((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      }
      if (current.length >= 4) {
        return [...current.slice(1), code];
      }
      return [...current, code];
    });
  };

  const downloadTableCsv = () => {
    const headers = [
      "Pricing Date",
      "Series",
      "Total Bid (bn)",
      "WAY Incoming (%)",
      "Owner Estimate (%)",
      "WAY Awarded (%)",
      "Total Awarded Bid (bn)",
    ];

    const csvRows = sortedRows.map((row) => [
      formatDateLabel(row.tanggal_lelang_pricing),
      toInstrumentLabel(row.code),
      formatBillionsFromMillions(row.total_penawaran, 2),
      formatPercent(row.way_incoming, 2),
      formatPercent(row.owners_estimate, 2),
      formatPercent(row.way_awarded, 2),
      formatBillionsFromMillions(row.total_penawaran_diterima, 2),
    ]);

    const content = [headers, ...csvRows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `primary-auction-table-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadChart = async () => {
    const svgElement = chartSvgRef.current;
    if (!svgElement || !hasChartData) {
      return;
    }

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const [ratioWidth, ratioHeight] = EXPORT_RATIO_MAP[exportRatio] || EXPORT_RATIO_MAP["16:9"];
    const baseWidth = 2200;
    const composedWidth = baseWidth;
    const composedHeight = Math.round((baseWidth * ratioHeight) / ratioWidth);
    const paddingLeft = Math.round(composedWidth * 0.07);
    const paddingRight = Math.round(composedWidth * 0.04);
    const paddingTop = Math.round(composedHeight * 0.13);
    const paddingBottom = Math.round(composedHeight * 0.18);
    const plotWidth = composedWidth - paddingLeft - paddingRight;
    const plotHeight = composedHeight - paddingTop - paddingBottom;

    const legendFontSize = 20;
    const legendDotRadius = 8;
    const legendItemGap = 28;
    const legendSymbolTextGap = 14;
    const legendY = composedHeight - Math.round(composedHeight * 0.06);
    const sourceY = composedHeight - Math.round(composedHeight * 0.02);

    const legendItems = selectedSeries.map((item, index) => {
      const label = toInstrumentLabel(item.code);
      const approxTextWidth = label.length * 11;
      const itemWidth = legendDotRadius * 2 + legendSymbolTextGap + approxTextWidth;
      return {
        label,
        color: seriesColors[index % seriesColors.length],
        itemWidth,
      };
    });

    const totalLegendWidth = legendItems.reduce((sum, item) => sum + item.itemWidth, 0)
      + Math.max(legendItems.length - 1, 0) * legendItemGap;
    const legendStartX = Math.max(
      paddingLeft,
      Math.round((composedWidth - totalLegendWidth) / 2),
    );

    let currentLegendX = legendStartX;
    const legendSvg = legendItems
      .map((item) => {
        const circleCx = currentLegendX + legendDotRadius;
        const textX = currentLegendX + legendDotRadius * 2 + legendSymbolTextGap;
        const chunk = `
          <circle cx="${circleCx}" cy="${legendY - 6}" r="${legendDotRadius}" fill="${item.color}" />
          <text x="${textX}" y="${legendY}" font-size="${legendFontSize}" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.text}">${escapeXml(item.label)}</text>
        `;
        currentLegendX += item.itemWidth + legendItemGap;
        return chunk;
      })
      .join("");

    const encodedInnerSvg = toBase64Utf8(svgString);
    const composedSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${composedWidth}" height="${composedHeight}" viewBox="0 0 ${composedWidth} ${composedHeight}">
        <rect width="100%" height="100%" fill="${palette.cardBg}" />
        <text x="${paddingLeft}" y="${Math.round(composedHeight * 0.08)}" font-size="44" font-weight="600" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.title}">Primary Market Auction Analysis</text>
        <image href="data:image/svg+xml;base64,${encodedInnerSvg}" x="${paddingLeft}" y="${paddingTop}" width="${plotWidth}" height="${plotHeight}" preserveAspectRatio="none" />
        ${legendSvg}
        <text x="${paddingLeft}" y="${sourceY}" font-size="20" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.subText}">Source: DJPPR Auction Data</text>
      </svg>
    `;

    const filenameBase = `primary-auction-${new Date().toISOString().slice(0, 10)}`;

    if (exportFileType === "svg") {
      const outputBlob = new Blob([composedSvg], { type: "image/svg+xml;charset=utf-8" });
      const outputUrl = URL.createObjectURL(outputBlob);
      const link = document.createElement("a");
      link.href = outputUrl;
      link.download = `${filenameBase}.svg`;
      link.click();
      URL.revokeObjectURL(outputUrl);
      return;
    }

    const composedBlob = new Blob([composedSvg], { type: "image/svg+xml;charset=utf-8" });
    const composedUrl = URL.createObjectURL(composedBlob);
    const image = new Image();

    image.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = composedWidth;
      canvas.height = composedHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(composedUrl);
        return;
      }

      context.fillStyle = palette.cardBg;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (exportFileType === "pdf") {
        const { jsPDF } = await import("jspdf");
        const orientation = composedWidth >= composedHeight ? "landscape" : "portrait";
        const pdf = new jsPDF({ orientation, unit: "px", format: [composedWidth, composedHeight] });
        const pngData = canvas.toDataURL("image/png");
        pdf.addImage(pngData, "PNG", 0, 0, composedWidth, composedHeight);
        pdf.save(`${filenameBase}.pdf`);
      } else {
        const mimeType = exportFileType === "jpeg" ? "image/jpeg" : "image/png";
        const quality = exportFileType === "jpeg" ? 0.95 : 1;
        const imageUrl = canvas.toDataURL(mimeType, quality);
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${filenameBase}.${exportFileType === "jpeg" ? "jpg" : "png"}`;
        link.click();
      }

      URL.revokeObjectURL(composedUrl);
    };

    image.src = composedUrl;
  };

  return (
    <section
      className="rounded-xl border p-4 md:p-5"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.cardBg,
      }}
    >
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="md:max-w-[52%]">
          <h2 className="text-[18px] font-semibold" style={{ color: palette.title }}>
            Primary Market Auction Analysis
          </h2>
          <p className="mt-1 text-[12px]" style={{ color: palette.subText }}>
            Compare owners estimate trends for each auction series over time, with auction details sorted from newest to oldest pricing date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportRatio}
            onChange={(event) => setExportRatio(event.target.value)}
            className="h-[30px] px-2 rounded-md border text-[11px] bg-transparent"
            style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
            aria-label="Select chart ratio"
            disabled={!hasChartData || loading}
          >
            {Object.keys(EXPORT_RATIO_MAP).map((ratio) => (
              <option key={ratio} value={ratio}>{ratio}</option>
            ))}
          </select>

          <select
            value={exportFileType}
            onChange={(event) => setExportFileType(event.target.value)}
            className="h-[30px] px-2 rounded-md border text-[11px] bg-transparent"
            style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
            aria-label="Select file type"
            disabled={!hasChartData || loading}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="svg">SVG</option>
            <option value="pdf">PDF</option>
          </select>

          <select
            value={chartStyle}
            onChange={(event) => setChartStyle(event.target.value)}
            className="h-[30px] px-2 rounded-md border text-[11px] bg-transparent"
            style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
            aria-label="Select chart style"
            disabled={!hasChartData || loading}
          >
            <option value="point">Point Chart</option>
            <option value="line">Line Chart</option>
          </select>

          <button
            onClick={downloadChart}
            disabled={!hasChartData || loading}
            className="h-[30px] px-3 rounded-md border text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
            onMouseEnter={(event) => {
              if (!event.currentTarget.disabled) {
                event.currentTarget.style.color = palette.buttonHover;
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = palette.buttonText;
            }}
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border p-3" style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
        <div className="flex flex-wrap items-center gap-1">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedPeriod(filter)}
              className="h-[28px] px-4 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap leading-none"
              style={
                selectedPeriod === filter
                  ? {
                      backgroundColor: palette.selectorActiveBg,
                      color: palette.selectorActiveText,
                    }
                  : {
                      backgroundColor: palette.chipBg,
                      color: palette.chipText,
                    }
              }
              onMouseEnter={(event) => {
                if (selectedPeriod !== filter) {
                  event.currentTarget.style.backgroundColor = palette.chipHover;
                }
              }}
              onMouseLeave={(event) => {
                if (selectedPeriod !== filter) {
                  event.currentTarget.style.backgroundColor = palette.chipBg;
                }
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-lg border p-3" style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
          <div className="mb-2 text-[11px] font-medium text-left" style={{ color: palette.subText }}>
          Select up to 4 series
        </div>
        <div className="flex flex-wrap justify-start gap-2">
          {orderedCodes.map((code) => {
            const active = selectedCodes.includes(code);
            return (
              <button
                key={code}
                onClick={() => toggleCode(code)}
                className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  borderColor: active ? palette.selectorActiveBg : palette.border,
                  backgroundColor: active ? palette.selectorActiveBg : palette.selectorBg,
                  color: active ? palette.selectorActiveText : palette.selectorText,
                }}
              >
                {toInstrumentLabel(code)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 rounded-lg border p-3" style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
        {loading ? (
          <div className="text-[12px]" style={{ color: palette.subText }}>
            Loading auction series...
          </div>
        ) : error ? (
          <div className="text-[12px] text-red-500">{error}</div>
        ) : !hasChartData ? (
          <div className="text-[12px]" style={{ color: palette.subText }}>
            Not enough owners estimate data to plot comparison.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              ref={chartSvgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="h-[280px] w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label="Owners estimate comparison by auction code"
            >
              {yTicks.map((tick) => {
                const y = yScale(tick);
                return (
                  <g key={`y-${tick}`}>
                    <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={palette.grid} strokeWidth="1" />
                    <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill={palette.axis}>
                      {formatPercent(tick, 2)}
                    </text>
                  </g>
                );
              })}

              {xTickDateIndices.map((tick) => {
                const x = xScale(tick.index);
                return (
                  <g key={`x-${tick.date}`}>
                    <line x1={x} y1={margin.top} x2={x} y2={height - margin.bottom} stroke={palette.grid} strokeWidth="1" />
                    <text x={x} y={height - margin.bottom + 18} textAnchor="middle" fontSize="12" fill={palette.axis}>
                      {selectedPeriod === "All Time" ? formatDateLabelShort(tick.date) : formatDateLabel(tick.date)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={margin.left}
                y1={height - margin.bottom}
                x2={width - margin.right}
                y2={height - margin.bottom}
                stroke={palette.axis}
                strokeWidth="1.5"
              />
              <line
                x1={margin.left}
                y1={margin.top}
                x2={margin.left}
                y2={height - margin.bottom}
                stroke={palette.axis}
                strokeWidth="1.5"
              />

              {chartSeries.map((seriesItem, index) => {
                const color = seriesColors[index % seriesColors.length];
                const pathData = buildSeriesPath(seriesItem.points, xScale, yScale);

                return (
                  <g key={seriesItem.code}>
                    {chartStyle === "line" ? (
                      <path d={pathData} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                    ) : null}
                    {seriesItem.points.map((point) => (
                      <circle
                        key={`${seriesItem.code}-${point.tanggal_lelang_pricing}`}
                        cx={xScale(point.xIndex)}
                        cy={yScale(point.owners_estimate)}
                        r={chartStyle === "line" ? 3 : 4}
                        fill={color}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            <div className="mt-2 flex flex-wrap justify-center gap-4 text-[11px]" style={{ color: palette.text }}>
              {chartSeries.map((seriesItem, index) => (
                <div key={`legend-${seriesItem.code}`} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: seriesColors[index % seriesColors.length] }}
                  />
                  <span>{toInstrumentLabel(seriesItem.code)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-lg border p-3" style={{ borderColor: palette.border, backgroundColor: palette.cardBg }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[12px] font-semibold" style={{ color: palette.title }}>
            Quantitative Analysis
          </div>
          <div className="flex items-center gap-2">
            {copyFeedback ? (
              <span className="text-[10px]" style={{ color: palette.subText }}>
                {copyFeedback}
              </span>
            ) : null}
            <button
              onClick={copyQuantitativeAnalysis}
              className="h-5 w-5 inline-flex items-center justify-center rounded border"
              style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
              aria-label="Copy quantitative analysis"
              title={copyFeedback || "Copy"}
            >
              <Copy size={11} />
            </button>
          </div>
        </div>
        {cfaNarrationItems.length === 0 ? (
          <div className="text-[11px]" style={{ color: palette.subText }}>
            Not enough data to generate analysis for the selected period and series.
          </div>
        ) : (
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed" style={{ color: palette.text }}>
            {cfaNarrationItems.map((item, index) => (
              <li key={`cfa-narration-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: palette.border }}>
        <table className="min-w-full border-collapse text-[12px]">
          <thead style={{ backgroundColor: palette.mutedBg }}>
            <tr>
              <th className="px-3 py-2 text-right font-semibold" style={{ color: palette.title }}>Pricing Date</th>
              <th className="px-3 py-2 text-left font-semibold" style={{ color: palette.title }}>Series</th>
              <th className="px-3 py-2 text-right font-semibold" style={{ color: palette.title }}>Total Bid (bn)</th>
              <th className="px-3 py-2 text-right font-semibold" style={{ color: palette.title }}>WAY Incoming (%)</th>
              <th className="px-3 py-2 text-right font-semibold" style={{ color: palette.title }}>Owner Estimate (%)</th>
              <th className="px-3 py-2 text-right font-semibold" style={{ color: palette.title }}>WAY Awarded (%)</th>
              <th className="px-3 py-2 text-right font-semibold" style={{ color: palette.title }}>Total Awarded Bid (bn)</th>
            </tr>
            <tr>
              <th colSpan={7} className="px-3 py-2 text-right">
                <button
                  onClick={downloadTableCsv}
                  disabled={sortedRows.length === 0 || loading}
                  className="h-[30px] px-3 rounded-md border text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
                  onMouseEnter={(event) => {
                    if (!event.currentTarget.disabled) {
                      event.currentTarget.style.color = palette.buttonHover;
                    }
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = palette.buttonText;
                  }}
                >
                  <Download size={12} />
                  Download CSV
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const previousRow = index > 0 ? sortedRows[index - 1] : null;
              const isBlockStart = !previousRow || previousRow.tanggal_lelang_pricing !== row.tanggal_lelang_pricing;

              return (
                <tr
                  key={`${row.tanggal_lelang_pricing}-${row.code}-${index}`}
                  style={{
                    borderTop: `${isBlockStart && index > 0 ? 2 : 1}px solid ${isBlockStart && index > 0 ? palette.axis : palette.border}`,
                    backgroundColor: isBlockStart ? palette.mutedBg : "transparent",
                  }}
                >
                <td className="px-3 py-2 text-right" style={{ color: palette.text }}>{formatDateLabel(row.tanggal_lelang_pricing)}</td>
                <td className="px-3 py-2 text-left" style={{ color: palette.text }}>{toInstrumentLabel(row.code)}</td>
                <td className="px-3 py-2 text-right" style={{ color: palette.text }}>{formatBillionsFromMillions(row.total_penawaran, 2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: palette.text }}>{formatPercent(row.way_incoming, 2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: palette.text }}>{formatPercent(row.owners_estimate, 2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: palette.text }}>{formatPercent(row.way_awarded, 2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: palette.text }}>{formatBillionsFromMillions(row.total_penawaran_diterima, 2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PrimaryAuctionAnalysis;
