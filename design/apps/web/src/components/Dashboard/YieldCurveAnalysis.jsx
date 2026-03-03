import React from "react";
import { Copy, Download } from "lucide-react";

const DARK_SERIES_COLORS = ["#9b5de5", "#ef476f", "#ffd166", "#06d6a0"];
const LIGHT_SERIES_COLORS = ["#f79256", "#fbd1a2", "#7dcfb6", "#9b5de5"];
const MAX_DATE_SLOTS = 4;
const X_AXIS_PADDING_RATIO = 0.04;
const MIN_SELECTABLE_YEAR = 2008;
const MAX_SELECTABLE_YEAR = 2026;
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

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return DATE_FORMATTER.format(date);
}

function getDateYear(value) {
  const text = String(value || "").trim();
  const directMatch = text.match(/^(\d{4})/);
  if (directMatch) {
    return directMatch[1];
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getFullYear());
}

function getDateMonth(value) {
  const text = String(value || "").trim();
  const directMatch = text.match(/^\d{4}-(\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getMonth() + 1).padStart(2, "0");
}

function isSelectableYear(yearValue) {
  const yearNumber = Number(yearValue);
  return Number.isFinite(yearNumber)
    && yearNumber >= MIN_SELECTABLE_YEAR
    && yearNumber <= MAX_SELECTABLE_YEAR;
}

const MONTH_OPTIONS = [
  { value: "", label: "All" },
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function normalizeYieldPointValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return Number.NaN;
  }
  return numericValue;
}

function formatYield(value, digits = 2, naLabel = "-") {
  if (!Number.isFinite(value)) {
    return naLabel;
  }
  return value.toFixed(digits);
}

function formatBps(value, digits = 0) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return (value * 100).toFixed(digits);
}

function formatSignedBps(value, digits = 0) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  const bps = value * 100;
  return `${bps > 0 ? "+" : ""}${bps.toFixed(digits)}`;
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

function classify2s10sRegime(spread2s10s) {
  if (!Number.isFinite(spread2s10s)) {
    return "regime unavailable";
  }
  if (spread2s10s < 0) {
    return "inverted";
  }
  if (spread2s10s <= 0.25) {
    return "flat";
  }
  return "normal";
}

function classifyCurveMove(levelChange, slopeChange) {
  if (!Number.isFinite(levelChange) || !Number.isFinite(slopeChange)) {
    return "cross-date move unavailable";
  }
  if (levelChange < 0 && slopeChange > 0) {
    return "bull steepening";
  }
  if (levelChange < 0 && slopeChange < 0) {
    return "bull flattening";
  }
  if (levelChange > 0 && slopeChange > 0) {
    return "bear steepening";
  }
  if (levelChange > 0 && slopeChange < 0) {
    return "bear flattening";
  }
  return "range-bound";
}

function buildPath(points, xScale, yScale) {
  if (points.length === 0) {
    return "";
  }

  const validPoints = points.filter((point) => Number.isFinite(point.value));
  if (validPoints.length === 0) {
    return "";
  }

  return validPoints
    .map((point, index) => {
      const x = xScale(point.tenor);
      const y = yScale(point.value);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function YieldCurveAnalysis({ theme = "light" }) {
  const chartSvgRef = React.useRef(null);
  const [availableDates, setAvailableDates] = React.useState([]);
  const [selectedDates, setSelectedDates] = React.useState([]);
  const [selectedDateSlots, setSelectedDateSlots] = React.useState(
    Array(MAX_DATE_SLOTS).fill(""),
  );
  const [selectedYearSlots, setSelectedYearSlots] = React.useState(
    Array(MAX_DATE_SLOTS).fill(""),
  );
  const [selectedMonthSlots, setSelectedMonthSlots] = React.useState(
    Array(MAX_DATE_SLOTS).fill(""),
  );
  const [series, setSeries] = React.useState([]);
  const [comparisons, setComparisons] = React.useState({});
  const [exportFileType, setExportFileType] = React.useState("png");
  const [exportRatio, setExportRatio] = React.useState("16:9");
  const [copyFeedback, setCopyFeedback] = React.useState("");
  const [isPhoneViewport, setIsPhoneViewport] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [warning, setWarning] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      setIsPhoneViewport(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
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
          selectorActiveBg: "#2962FF",
          selectorActiveText: "#FFFFFF",
          selectorText: "#C9D1D9",
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
          selectorActiveBg: "#2962FF",
          selectorActiveText: "#FFFFFF",
          selectorText: "#30343F",
          buttonBorder: "#D0D3DA",
          buttonText: "#4B4E59",
          buttonHover: "#1A1A1A",
        };

  const seriesColors = theme === "dark" ? DARK_SERIES_COLORS : LIGHT_SERIES_COLORS;

  const fetchCurve = React.useCallback(async (dates = []) => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      dates.slice(0, 4).forEach((date) => query.append("dates", date));
      query.set("t", String(Date.now()));

      const response = await fetch(`/api/yield-curve?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch yield curve data");
      }

      const payload = await response.json();
      const nextAvailableDates = payload.availableDates || [];
      setAvailableDates(nextAvailableDates);
      const nextSelectedDates = (payload.selectedDates || []).slice(0, MAX_DATE_SLOTS);
      setSelectedDates(nextSelectedDates);
      setSelectedDateSlots(() => {
        const slots = Array(MAX_DATE_SLOTS).fill("");
        nextSelectedDates.forEach((date, index) => {
          slots[index] = date;
        });
        return slots;
      });
      setSelectedYearSlots(() => {
        const defaultYear = String(MAX_SELECTABLE_YEAR);
        const slots = Array(MAX_DATE_SLOTS).fill(defaultYear);
        nextSelectedDates.forEach((date, index) => {
          const yearValue = getDateYear(date);
          slots[index] = isSelectableYear(yearValue) ? yearValue : defaultYear;
        });
        return slots;
      });
      setSelectedMonthSlots(() => {
        const slots = Array(MAX_DATE_SLOTS).fill("");
        nextSelectedDates.forEach((date, index) => {
          slots[index] = getDateMonth(date) || "";
        });
        return slots;
      });
      const normalizedSeries = (payload.series || []).map((curve) => ({
        ...curve,
        points: (curve.points || []).map((point) => ({
          ...point,
          value: normalizeYieldPointValue(point.value),
        })),
      }));

      setSeries(normalizedSeries);
      setComparisons(payload.comparisons || {});
    } catch (fetchError) {
      setError("Failed to load Indonesia bond yield curve data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCurve([]);
  }, [fetchCurve]);

  const availableYears = React.useMemo(() => {
    const years = [];
    for (let year = MAX_SELECTABLE_YEAR; year >= MIN_SELECTABLE_YEAR; year -= 1) {
      years.push(String(year));
    }
    return years;
  }, []);

  const applyDateSelection = React.useCallback(
    (nextSlots) => {
      const nextSelection = nextSlots
        .filter(Boolean)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
      if (new Set(nextSelection).size !== nextSelection.length) {
        setWarning("Each selected date must be unique.");
        return false;
      }

      setWarning("");
      setSelectedDateSlots(nextSlots);
      fetchCurve(nextSelection);
      return true;
    },
    [fetchCurve],
  );

  const handleDateSlotChange = (slotIndex, value) => {
    const nextSlots = [...selectedDateSlots];
    nextSlots[slotIndex] = value;

    const nextYearSlots = [...selectedYearSlots];
    nextYearSlots[slotIndex] = value ? getDateYear(value) : nextYearSlots[slotIndex] || availableYears[0] || "";
    setSelectedYearSlots(nextYearSlots);

    const nextMonthSlots = [...selectedMonthSlots];
    nextMonthSlots[slotIndex] = value ? getDateMonth(value) : nextMonthSlots[slotIndex] || "";
    setSelectedMonthSlots(nextMonthSlots);

    applyDateSelection(nextSlots);
  };

  const handleYearSlotChange = (slotIndex, yearValue) => {
    const nextYearSlots = [...selectedYearSlots];
    nextYearSlots[slotIndex] = yearValue;
    setSelectedYearSlots(nextYearSlots);

    const currentDate = selectedDateSlots[slotIndex];
    if (currentDate && getDateYear(currentDate) !== yearValue) {
      const nextSlots = [...selectedDateSlots];
      nextSlots[slotIndex] = "";
      applyDateSelection(nextSlots);
    }
  };

  const handleMonthSlotChange = (slotIndex, monthValue) => {
    const nextMonthSlots = [...selectedMonthSlots];
    nextMonthSlots[slotIndex] = monthValue;
    setSelectedMonthSlots(nextMonthSlots);

    const currentDate = selectedDateSlots[slotIndex];
    if (currentDate && monthValue && getDateMonth(currentDate) !== monthValue) {
      const nextSlots = [...selectedDateSlots];
      nextSlots[slotIndex] = "";
      applyDateSelection(nextSlots);
    }
  };

  const allValues = series.flatMap((curve) => curve.points.map((point) => point.value));
  const finiteValues = allValues.filter((value) => Number.isFinite(value));
  const allTenors = series.flatMap((curve) => curve.points.map((point) => point.tenor));

  const hasData = finiteValues.length > 0 && allTenors.length > 0;

  const width = 1000;
  const height = 240;
  const margin = { top: 8, right: 20, bottom: 24, left: 68 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const minX = hasData ? Math.min(...allTenors) : 0;
  const maxX = hasData ? Math.max(...allTenors) : 1;
  const xPadding = hasData ? Math.max((maxX - minX) * X_AXIS_PADDING_RATIO, 0.25) : 0;
  const minXDomain = minX - xPadding;
  const maxXDomain = maxX + xPadding;
  const minYRaw = hasData ? Math.min(...finiteValues) : 0;
  const maxYRaw = hasData ? Math.max(...finiteValues) : 1;
  const yPadding = Math.max((maxYRaw - minYRaw) * 0.08, 0.1);
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

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return maxY - ratio * (maxY - minY);
  });

  const yAxisTickFontSize = 12;
  const xAxisTickFontSize = 12;
  const axisTitleFontSize = 12;
  const axisLabelColor = palette.axis;

  const xTickSource = hasData ? [...new Set(allTenors)].sort((left, right) => left - right) : [];
  const xStep = xTickSource.length > 10 ? Math.ceil(xTickSource.length / 10) : 1;
  const xTicks = xTickSource.filter((_, index) => index % xStep === 0 || index === xTickSource.length - 1);

  const quantitativeRows = series
    .map((curve) => {
      const pointMap = new Map(curve.points.map((point) => [point.tenor, point.value]));
      const validPoints = curve.points.filter((point) => Number.isFinite(point.value));
      const firstPoint = validPoints[0];
      const lastPoint = validPoints[validPoints.length - 1];
      const averageYield =
        validPoints.length > 0
          ? validPoints.reduce((sum, point) => sum + point.value, 0) / validPoints.length
          : Number.NaN;
      const slope =
        firstPoint && lastPoint && Number.isFinite(firstPoint.value) && Number.isFinite(lastPoint.value)
          ? lastPoint.value - firstPoint.value
          : Number.NaN;
      const spread2s10s =
        Number.isFinite(pointMap.get(10)) && Number.isFinite(pointMap.get(2))
          ? pointMap.get(10) - pointMap.get(2)
          : Number.NaN;

      return {
        date: curve.date,
        avg: averageYield,
        slope,
        spread2s10s,
        points: pointMap,
      };
    })
    .filter((row) => Number.isFinite(row.avg) || Number.isFinite(row.slope) || Number.isFinite(row.spread2s10s));

  const cfaNarrationRows = quantitativeRows.map((row) => {
    const rowComparisons = comparisons[row.date] || {};
    const previousDayDelta = rowComparisons.previousDay?.delta || null;
    const previous30DaysDelta = rowComparisons.previous30Days?.delta || null;
    const previousYearDelta = rowComparisons.previousYear?.delta || null;

    return {
      ...row,
      comparisonPreviousDay: rowComparisons.previousDay || null,
      comparisonPrevious30Days: rowComparisons.previous30Days || null,
      comparisonPreviousYear: rowComparisons.previousYear || null,
      movePreviousDay: classifyCurveMove(previousDayDelta?.avg, previousDayDelta?.spread2s10s),
      movePrevious30Days: classifyCurveMove(previous30DaysDelta?.avg, previous30DaysDelta?.spread2s10s),
      movePreviousYear: classifyCurveMove(previousYearDelta?.avg, previousYearDelta?.spread2s10s),
      regime: classify2s10sRegime(row.spread2s10s),
    };
  });

  const tableTenors = [...new Set(allTenors)].sort((left, right) => left - right);

  const copyQuantitativeNarration = async () => {
    const narrationText = cfaNarrationRows
      .map((row) => {
        return `${formatDateLabel(row.date)}: curve level proxy at ${formatYield(row.avg)}%; 2s10s at ${formatBps(row.spread2s10s)} bps (${row.regime} term structure). Long-end minus short-end slope is ${formatYield(row.slope)} pp. Versus previous day${row.comparisonPreviousDay?.date ? ` (${formatDateLabel(row.comparisonPreviousDay.date)})` : ""}: level ${formatSignedBps(row.comparisonPreviousDay?.delta?.avg)} bps, 2s10s ${formatSignedBps(row.comparisonPreviousDay?.delta?.spread2s10s)} bps (${row.movePreviousDay}). Versus previous 30 days${row.comparisonPrevious30Days?.date ? ` (${formatDateLabel(row.comparisonPrevious30Days.date)})` : ""}: level ${formatSignedBps(row.comparisonPrevious30Days?.delta?.avg)} bps, 2s10s ${formatSignedBps(row.comparisonPrevious30Days?.delta?.spread2s10s)} bps (${row.movePrevious30Days}). Versus last year point${row.comparisonPreviousYear?.date ? ` (${formatDateLabel(row.comparisonPreviousYear.date)})` : ""}: level ${formatSignedBps(row.comparisonPreviousYear?.delta?.avg)} bps, 2s10s ${formatSignedBps(row.comparisonPreviousYear?.delta?.spread2s10s)} bps (${row.movePreviousYear}).`;
      })
      .join("\n");

    if (!narrationText) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(narrationText);
        setCopyFeedback("Copied");
        window.setTimeout(() => setCopyFeedback(""), 1500);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = narrationText;
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

  const downloadChart = async () => {
    const svgElement = chartSvgRef.current;
    if (!svgElement) {
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
    const paddingTop = Math.round(composedHeight * 0.12);
    const paddingBottom = Math.round(composedHeight * 0.16);
    const plotWidth = composedWidth - paddingLeft - paddingRight;
    const plotHeight = composedHeight - paddingTop - paddingBottom;

    const legendFontSize = 20;
    const legendDotRadius = 8;
    const legendItemGap = 28;
    const legendSymbolTextGap = 14;
    const legendY = composedHeight - Math.round(composedHeight * 0.055);
    const sourceY = composedHeight - Math.round(composedHeight * 0.02);

    const legendItems = series.map((curve, index) => {
      const label = formatDateLabel(curve.date);
      const approxTextWidth = label.length * 12;
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
        <text x="${paddingLeft}" y="${Math.round(composedHeight * 0.08)}" font-size="44" font-weight="600" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.title}">Indonesia Bond Yield Curve Analysis</text>
        <image href="data:image/svg+xml;base64,${encodedInnerSvg}" x="${paddingLeft}" y="${paddingTop}" width="${plotWidth}" height="${plotHeight}" preserveAspectRatio="none" />
        ${legendSvg}
        <text x="${paddingLeft}" y="${sourceY}" font-size="20" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.subText}">Source: Indonesia Bond Pricing Agency</text>
      </svg>
    `;

    const filenameBase = `yield-curve-${new Date().toISOString().slice(0, 10)}`;

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

  const downloadTableCsv = () => {
    const headers = ["Tenor", ...quantitativeRows.map((row) => formatDateLabel(row.date))];
    const rows = tableTenors.map((tenor) => [
      `${tenor}Y`,
      ...quantitativeRows.map((row) => formatYield(row.points.get(tenor), 2, "n/a")),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yield-curve-table-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-lg p-4 md:p-6"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="md:max-w-[52%]">
          <h3 className="text-[16px] font-semibold" style={{ color: palette.title }}>
            Indonesia Bond Yield Curve Analysis
          </h3>
          <p className="text-[12px] mt-1" style={{ color: palette.subText }}>
            The yield curve shows bond yields across maturities; its shape helps assess growth and inflation expectations, monetary policy stance, and potential stress or recession signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportRatio}
            onChange={(event) => setExportRatio(event.target.value)}
            className="h-[30px] px-2 rounded-md border text-[11px] bg-transparent"
            style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
            aria-label="Select chart ratio"
            disabled={!hasData || loading}
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
            disabled={!hasData || loading}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="svg">SVG</option>
            <option value="pdf">PDF</option>
          </select>

          <button
            onClick={downloadChart}
            disabled={!hasData || loading}
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

      <div
        className="rounded-lg border p-3 mb-4"
        style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}
      >
        <div className="text-[12px] mb-2" style={{ color: palette.subText }}>
          Select up to 4 dates (dropdown)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedDateSlots.map((selectedDate, slotIndex) => (
            <div
              key={`slot-${slotIndex}`}
              className="rounded-md border p-2.5"
              style={{
                borderColor: seriesColors[slotIndex % seriesColors.length],
                backgroundColor: palette.cardBg,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: palette.title }}>
                  Selection {slotIndex + 1}
                </span>
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: seriesColors[slotIndex % seriesColors.length] }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-1">
                <label
                  htmlFor={`yield-curve-year-${slotIndex}`}
                  className="block text-[11px]"
                  style={{ color: palette.subText }}
                >
                  Year
                </label>
                <label
                  htmlFor={`yield-curve-month-${slotIndex}`}
                  className="block text-[11px]"
                  style={{ color: palette.subText }}
                >
                  Month
                </label>
                <label
                  htmlFor={`yield-curve-date-${slotIndex}`}
                  className="block text-[11px] text-right"
                  style={{ color: palette.subText }}
                >
                  Date {slotIndex + 1}
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  id={`yield-curve-year-${slotIndex}`}
                  value={selectedYearSlots[slotIndex] || availableYears[0] || ""}
                  onChange={(event) => handleYearSlotChange(slotIndex, event.target.value)}
                  className="h-[30px] w-full rounded-md border px-2 text-[11px]"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.selectorBg,
                    color: palette.selectorText,
                  }}
                >
                  {availableYears.map((year) => (
                    <option key={`year-${slotIndex}-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  id={`yield-curve-month-${slotIndex}`}
                  value={selectedMonthSlots[slotIndex] || ""}
                  onChange={(event) => handleMonthSlotChange(slotIndex, event.target.value)}
                  className="h-[30px] w-full rounded-md border px-2 text-[11px]"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.selectorBg,
                    color: palette.selectorText,
                  }}
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={`month-${slotIndex}-${month.value || "all"}`} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              <select
                id={`yield-curve-date-${slotIndex}`}
                value={selectedDate}
                onChange={(event) => handleDateSlotChange(slotIndex, event.target.value)}
                className="h-[30px] w-full rounded-md border px-2 text-[11px] text-right"
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.selectorBg,
                  color: palette.selectorText,
                  textAlign: "right",
                  textAlignLast: "right",
                }}
              >
                <option value="" style={{ textAlign: "right" }}>
                  None
                </option>
                {availableDates
                  .filter((date) => getDateYear(date) === (selectedYearSlots[slotIndex] || availableYears[0] || ""))
                  .filter((date) => {
                    const selectedMonth = selectedMonthSlots[slotIndex] || "";
                    return !selectedMonth || getDateMonth(date) === selectedMonth;
                  })
                  .map((date) => (
                  <option key={`${slotIndex}-${date}`} value={date} style={{ textAlign: "right" }}>
                    {formatDateLabel(date)}
                  </option>
                  ))}
              </select>
              </div>
            </div>
          ))}
        </div>
        {warning ? (
          <div className="text-[11px] mt-2" style={{ color: "#EF4444" }}>
            {warning}
          </div>
        ) : null}
      </div>

      <div
        className="rounded-lg border p-3"
        style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}
      >
        {loading ? (
          <div className="text-[12px]" style={{ color: palette.subText }}>
            Loading yield curve...
          </div>
        ) : error ? (
          <div className="text-[12px]" style={{ color: "#EF4444" }}>
            {error}
          </div>
        ) : !hasData ? (
          <div className="text-[12px]" style={{ color: palette.subText }}>
            No data available for selected dates.
          </div>
        ) : (
          <>
            <div className="w-full">
              <svg ref={chartSvgRef} viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full">
                {yTicks.map((tick) => {
                  const y = yScale(tick);
                  return (
                    <g key={`y-${tick}`}>
                      <line
                        x1={margin.left}
                        y1={y}
                        x2={margin.left + innerWidth}
                        y2={y}
                        stroke={palette.grid}
                        strokeWidth="1"
                      />
                      <text
                        x={margin.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={yAxisTickFontSize}
                        fontWeight="300"
                        fill={axisLabelColor}
                      >
                        {tick.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {xTicks.map((tick) => {
                  const x = xScale(tick);
                  return (
                    <g key={`x-${tick}`}>
                      <line
                        x1={x}
                        y1={margin.top}
                        x2={x}
                        y2={margin.top + innerHeight}
                        stroke={palette.grid}
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={x}
                        y={margin.top + innerHeight + 10}
                        textAnchor="middle"
                        fontSize={xAxisTickFontSize}
                        fontWeight="300"
                        fill={axisLabelColor}
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {series.map((curve, index) => {
                  const color = seriesColors[index % seriesColors.length];
                  const path = buildPath(curve.points, xScale, yScale);
                  return (
                    <g key={`curve-${curve.date}`}>
                      <path d={path} fill="none" stroke={color} strokeWidth="2" />
                      {curve.points.filter((point) => Number.isFinite(point.value)).map((point) => (
                        <circle
                          key={`${curve.date}-${point.label}`}
                          cx={xScale(point.tenor)}
                          cy={yScale(point.value)}
                          r="2.5"
                          fill={color}
                        />
                      ))}
                    </g>
                  );
                })}

                <text
                  x={margin.left + innerWidth / 2}
                  y={height + 10}
                  textAnchor="middle"
                  fontSize={axisTitleFontSize}
                  fontWeight="300"
                  fill={axisLabelColor}
                >
                  Tenor (Years)
                </text>
                <text
                  x={14}
                  y={margin.top + innerHeight / 2}
                  textAnchor="middle"
                  fontSize={axisTitleFontSize}
                  fontWeight="300"
                  fill={axisLabelColor}
                  transform={`rotate(-90, 14, ${margin.top + innerHeight / 2})`}
                >
                  Yield (%)
                </text>
              </svg>
            </div>

            <div className="mt-3">
              <div className="flex flex-wrap justify-center gap-3">
                {series.map((curve, index) => (
                  <div key={curve.date} className="flex items-center gap-2 text-[10px]" style={{ color: palette.text }}>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: seriesColors[index % seriesColors.length] }}
                    />
                    <span className="text-right">{formatDateLabel(curve.date)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px]" style={{ color: palette.subText }}>
                Source: Indonesia Bond Pricing Agency
              </div>
            </div>

            <div className="mt-4 rounded-md border p-3" style={{ borderColor: palette.border, backgroundColor: palette.cardBg }}>
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
                    onClick={copyQuantitativeNarration}
                    className="h-5 w-5 inline-flex items-center justify-center rounded border"
                    style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
                    aria-label="Copy quantitative analysis"
                    title={copyFeedback || "Copy"}
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed" style={{ color: palette.text }}>
                {cfaNarrationRows.map((row) => (
                  <li key={`narrative-${row.date}`}>
                    <span className="font-medium">{formatDateLabel(row.date)}</span>
                    {`: curve level proxy at ${formatYield(row.avg)}%; 2s10s at ${formatBps(row.spread2s10s)} bps (${row.regime} term structure). Long-end minus short-end slope is ${formatYield(row.slope)} pp.`}
                    {` Versus previous day${row.comparisonPreviousDay?.date ? ` (${formatDateLabel(row.comparisonPreviousDay.date)})` : ""}: level ${formatSignedBps(row.comparisonPreviousDay?.delta?.avg)} bps, 2s10s ${formatSignedBps(row.comparisonPreviousDay?.delta?.spread2s10s)} bps (${row.movePreviousDay}).`}
                    {` Versus previous 30 days${row.comparisonPrevious30Days?.date ? ` (${formatDateLabel(row.comparisonPrevious30Days.date)})` : ""}: level ${formatSignedBps(row.comparisonPrevious30Days?.delta?.avg)} bps, 2s10s ${formatSignedBps(row.comparisonPrevious30Days?.delta?.spread2s10s)} bps (${row.movePrevious30Days}).`}
                    {` Versus last year point${row.comparisonPreviousYear?.date ? ` (${formatDateLabel(row.comparisonPreviousYear.date)})` : ""}: level ${formatSignedBps(row.comparisonPreviousYear?.delta?.avg)} bps, 2s10s ${formatSignedBps(row.comparisonPreviousYear?.delta?.spread2s10s)} bps (${row.movePreviousYear}).`}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 rounded-md border p-3" style={{ borderColor: palette.border, backgroundColor: palette.cardBg }}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[12px] font-semibold" style={{ color: palette.title }}>
                  Tenor-by-Date Table (%)
                </div>
                <button
                  onClick={downloadTableCsv}
                  disabled={!hasData || loading}
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
                  Download CSV
                </button>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[520px] text-[11px]" style={{ color: palette.text }}>
                  <thead>
                    <tr>
                      <th className="text-right py-1 pr-2" style={{ color: palette.subText }}>
                        Tenor
                      </th>
                      {quantitativeRows.map((row) => (
                        <th key={`th-${row.date}`} className="text-right py-1 px-2" style={{ color: palette.subText }}>
                          {formatDateLabel(row.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableTenors.map((tenor) => (
                      <tr key={`row-${tenor}`}>
                        <td className="text-right py-1 pr-2">{tenor}Y</td>
                        {quantitativeRows.map((row) => (
                          <td key={`cell-${tenor}-${row.date}`} className="text-right py-1 px-2">
                            {formatYield(row.points.get(tenor), 2, "n/a")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
