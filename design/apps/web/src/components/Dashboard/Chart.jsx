import React from "react";
import { BarChart3, Copy, Download } from "lucide-react";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 240;
const CHART_X_PADDING_RATIO = 0.04;
const CHART_X_PADDING_PX = CHART_WIDTH * CHART_X_PADDING_RATIO;

function getChartX(index, length) {
  const minX = CHART_X_PADDING_PX;
  const maxX = CHART_WIDTH - CHART_X_PADDING_PX;

  if (length <= 1) {
    return (minX + maxX) / 2;
  }

  return minX + (index / (length - 1)) * (maxX - minX);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatDateLong(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function buildTickLabels(data, step, minGapPercent = 8) {
  const length = data.length;
  if (length === 0) {
    return [];
  }

  const denominator = Math.max(1, length - 1);
  const minLeftPercent = (CHART_X_PADDING_PX / CHART_WIDTH) * 100;
  const maxLeftPercent = 100 - minLeftPercent;
  const availableWidthPercent = maxLeftPercent - minLeftPercent;

  const rawTicks = data
    .map((item, index) => {
      const shouldShow =
        index === 0 ||
        index === length - 1 ||
        index % step === 0;

      if (!shouldShow) {
        return null;
      }

      return {
        key: `${item.recorded_at}-${index}`,
        leftPercent: minLeftPercent + (index / denominator) * availableWidthPercent,
        label: formatDate(item.recorded_at),
      };
    })
    .filter(Boolean);

  if (rawTicks.length <= 2) {
    return rawTicks;
  }

  const filtered = [rawTicks[0]];
  for (let i = 1; i < rawTicks.length - 1; i++) {
    const current = rawTicks[i];
    const previous = filtered[filtered.length - 1];
    if (current.leftPercent - previous.leftPercent >= minGapPercent) {
      filtered.push(current);
    }
  }

  const last = rawTicks[rawTicks.length - 1];
  const previous = filtered[filtered.length - 1];
  if (last.leftPercent - previous.leftPercent < minGapPercent && filtered.length > 1) {
    filtered.pop();
  }
  filtered.push(last);

  return filtered;
}

function getDomain(values) {
  if (values.length === 0) {
    return { min: 0, max: 100 };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    const pad = Math.max(1, Math.abs(minValue) * 0.05);
    return {
      min: minValue - pad,
      max: maxValue + pad,
    };
  }

  const range = maxValue - minValue;
  const pad = range * 0.12;
  return {
    min: minValue - pad,
    max: maxValue + pad,
  };
}

function buildYAxisTicks(domain, tickCount = 6) {
  const rawMin = Number(domain?.min);
  const rawMax = Number(domain?.max);

  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax) || rawMax <= rawMin) {
    return {
      min: 0,
      max: 1,
      ticks: [
        { value: 1, label: "1.00", topPercent: 0 },
        { value: 0.5, label: "0.50", topPercent: 50 },
        { value: 0, label: "0.00", topPercent: 100 },
      ],
    };
  }

  const getNiceStep = (rawStep) => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;

    if (residual <= 1) return 1 * magnitude;
    if (residual <= 2) return 2 * magnitude;
    if (residual <= 2.5) return 2.5 * magnitude;
    if (residual <= 5) return 5 * magnitude;
    return 10 * magnitude;
  };

  const rawStep = (rawMax - rawMin) / Math.max(1, tickCount - 1);
  let step = getNiceStep(Math.max(rawStep, 1e-9));
  let min = Math.floor(rawMin / step) * step;
  let max = Math.ceil(rawMax / step) * step;

  let count = Math.round((max - min) / step) + 1;
  while (count > 20) {
    step = getNiceStep(step * 1.5);
    min = Math.floor(rawMin / step) * step;
    max = Math.ceil(rawMax / step) * step;
    count = Math.round((max - min) / step) + 1;
  }

  const decimals = step >= 1 ? 2 : Math.max(2, Math.ceil(-Math.log10(step)));
  const range = Math.max(1e-9, max - min);

  const ticks = Array.from({ length: count }, (_, index) => {
    const value = max - index * step;
    const topPercent = ((max - value) / range) * 100;
    return {
      value,
      label: formatNumber(value, decimals),
      topPercent,
    };
  });

  return { min, max, ticks };
}

function buildLinePath(data, domain) {
  if (data.length === 0) {
    return "";
  }

  return data
    .map((point, index) => {
      const x = getChartX(index, data.length);
      const ratio =
        (point.numeric - domain.min) /
        Math.max(1e-9, domain.max - domain.min);
      const y = CHART_HEIGHT - ratio * CHART_HEIGHT;
      return `${x},${Math.max(0, Math.min(CHART_HEIGHT, y))}`;
    })
    .join(" ");
}

function getPointCoordinates(data, index, domain) {
  if (!Array.isArray(data) || data.length === 0 || index < 0 || index >= data.length) {
    return null;
  }

  const point = data[index];
  const x = getChartX(index, data.length);
  const ratio =
    (point.numeric - domain.min) /
    Math.max(1e-9, domain.max - domain.min);
  const y = CHART_HEIGHT - ratio * CHART_HEIGHT;

  return {
    x,
    y: Math.max(0, Math.min(CHART_HEIGHT, y)),
  };
}

function buildCompareSegments(data, domain) {
  if (data.length < 2) {
    return [];
  }

  const points = data.map((point, index) => {
    const x = getChartX(index, data.length);
    const ratio =
      (point.numeric - domain.min) /
      Math.max(1e-9, domain.max - domain.min);
    const y = CHART_HEIGHT - ratio * CHART_HEIGHT;

    return {
      x,
      y: Math.max(0, Math.min(CHART_HEIGHT, y)),
      numeric: point.numeric,
    };
  });

  const segments = [];
  let currentPositive = points[0].numeric > 0;
  let currentPoints = [`${points[0].x},${points[0].y}`];

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const previousPositive = previous.numeric > 0;
    const currentPositivePoint = current.numeric > 0;

    if (previousPositive === currentPositivePoint || previous.numeric === current.numeric) {
      currentPoints.push(`${current.x},${current.y}`);
      continue;
    }

    const ratio = (0 - previous.numeric) / (current.numeric - previous.numeric);
    const crossingX = previous.x + ratio * (current.x - previous.x);
    const crossingY = previous.y + ratio * (current.y - previous.y);
    const crossingPoint = `${crossingX},${crossingY}`;

    currentPoints.push(crossingPoint);
    if (currentPoints.length >= 2) {
      segments.push({
        positive: currentPositive,
        points: currentPoints.join(" "),
      });
    }

    currentPoints = [crossingPoint, `${current.x},${current.y}`];
    currentPositive = currentPositivePoint;
  }

  if (currentPoints.length >= 2) {
    segments.push({
      positive: currentPositive,
      points: currentPoints.join(" "),
    });
  }

  return segments;
}

function buildQuantitativeNarration(stats, mode, data = []) {
  if (!stats) {
    return "";
  }

  const mean = formatNumber(stats.average, 2);
  const median = formatNumber(stats.median, 2);
  const stdDev = formatNumber(stats.stdDev, 2);
  const min = formatNumber(stats.min, 2);
  const max = formatNumber(stats.max, 2);
  const volatility = formatNumber(stats.volatility, 1);
  const trendText =
    stats.trend === "positive"
      ? "upward"
      : stats.trend === "negative"
        ? "downward"
        : "stable";

  const baseNarration =
    `Series shows a ${trendText} profile with mean ${mean} (median ${median}). ` +
    `Risk is reflected by ${volatility}% volatility and dispersion of ${stdDev}, across a ${min} to ${max} range.`;

  const formatSigned = (value, decimals = 2, suffix = "") => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "n/a";
    }
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${formatNumber(Math.abs(number), decimals)}${suffix}`;
  };

  const findPointAtOrBefore = (points, targetDate, excludeLast = true) => {
    if (!Array.isArray(points) || points.length === 0 || !(targetDate instanceof Date)) {
      return null;
    }

    const startIndex = excludeLast ? points.length - 2 : points.length - 1;
    for (let index = startIndex; index >= 0; index--) {
      const point = points[index];
      const date = new Date(point.recorded_at);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      if (date <= targetDate) {
        return point;
      }
    }

    return null;
  };

  let minNarration = "";
  let maxNarration = "";
  let latestNarration = "";
  if (Array.isArray(data) && data.length > 0) {
    const minPoint = [...data].find((point) => point.numeric === stats.min);
    const maxPoint = [...data].find((point) => point.numeric === stats.max);
    if (minPoint?.recorded_at && Number.isFinite(minPoint.numeric)) {
      minNarration = ` Minimum was ${formatNumber(minPoint.numeric, 2)} on ${formatDateLong(minPoint.recorded_at)}.`;
    }
    if (maxPoint?.recorded_at && Number.isFinite(maxPoint.numeric)) {
      maxNarration = ` Maximum was ${formatNumber(maxPoint.numeric, 2)} on ${formatDateLong(maxPoint.recorded_at)}.`;
    }

    const latestPoint = data[data.length - 1];
    const latestDate = latestPoint?.recorded_at ? new Date(latestPoint.recorded_at) : null;
    if (latestPoint && latestDate && !Number.isNaN(latestDate.getTime()) && Number.isFinite(latestPoint.numeric)) {
      const canApplyMonthlyComparison = data.length >= 30;
      const oneDayTarget = new Date(latestDate);
      oneDayTarget.setDate(oneDayTarget.getDate() - 1);

      const dayPoint = findPointAtOrBefore(data, oneDayTarget, true);
      const monthPoint = canApplyMonthlyComparison
        ? findPointAtOrBefore(
            data,
            (() => {
              const oneMonthTarget = new Date(latestDate);
              oneMonthTarget.setMonth(oneMonthTarget.getMonth() - 1);
              return oneMonthTarget;
            })(),
            true,
          )
        : null;

      const dayPointChange = dayPoint ? latestPoint.numeric - dayPoint.numeric : null;
      const dayPercentChange =
        dayPoint && Math.abs(dayPoint.numeric) > 1e-9
          ? (dayPointChange / dayPoint.numeric) * 100
          : null;

      const monthPointChange = monthPoint ? latestPoint.numeric - monthPoint.numeric : null;
      const monthPercentChange =
        monthPoint && Math.abs(monthPoint.numeric) > 1e-9
          ? (monthPointChange / monthPoint.numeric) * 100
          : null;

      const dayPart = dayPoint
        ? `vs 1 day earlier (${formatDateLong(dayPoint.recorded_at)}), it moved ${formatSigned(dayPointChange, 2, " pts")} (${formatSigned(dayPercentChange, 2, "%")})`
        : "vs 1 day earlier, change data is unavailable";

      const monthPart = canApplyMonthlyComparison
        ? monthPoint
          ? `vs 1 month earlier (${formatDateLong(monthPoint.recorded_at)}), it moved ${formatSigned(monthPointChange, 2, " pts")} (${formatSigned(monthPercentChange, 2, "%")})`
          : "vs 1 month earlier, change data is unavailable"
        : "";

      latestNarration =
        ` Latest value is ${formatNumber(latestPoint.numeric, 2)} on ${formatDateLong(latestPoint.recorded_at)}; ` +
        `${dayPart}${monthPart ? `; ${monthPart}` : ""}.`;
    }
  }

  const extremaNarration = `${minNarration}${maxNarration}`;

  if (mode !== "compare") {
    return `${baseNarration}${extremaNarration}${latestNarration}`;
  }

  const correlation = formatNumber(stats.correlation, 2);
  const corrAbs = Math.abs(Number(stats.correlation) || 0);
  const corrStrength =
    corrAbs >= 0.7
      ? "strong"
      : corrAbs >= 0.4
        ? "moderate"
        : "weak";
  const corrDirection = (Number(stats.correlation) || 0) >= 0 ? "positive" : "negative";

  return `${baseNarration}${extremaNarration}${latestNarration} Correlation is ${correlation}, indicating a ${corrStrength} ${corrDirection} relationship.`;
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

const EXPORT_RATIO_MAP = {
  "16:9": [16, 9],
  "4:3": [4, 3],
  "3:2": [3, 2],
  "2:1": [2, 1],
  "1:1": [1, 1],
};

export function Chart({
  chartData,
  calculatedData,
  stats,
  loading,
  mode,
  selectedTimeFilter,
  variables,
  selectedVariable1,
  theme = "light",
}) {
  const chartSvgRef = React.useRef(null);
  const [exportFileType, setExportFileType] = React.useState("png");
  const [exportRatio, setExportRatio] = React.useState("16:9");
  const [hoveredIndex, setHoveredIndex] = React.useState(null);
  const [copyFeedback, setCopyFeedback] = React.useState("");
  const palette =
    theme === "dark"
      ? {
          cardBg: "#0F1117",
          border: "#21262D",
          title: "#F0F6FC",
          subText: "#8B949E",
          gridMajor: "rgba(139, 148, 158, 0.15)",
          gridMinor: "rgba(139, 148, 158, 0.08)",
          axis: "#F0F6FC",
          linePrimary: "#FDE725",
          lineAccent: "#FDE725",
          lineHighlight: "#FDE725",
          comparePositive: "#a8dadc",
          compareNegative: "#ec9a9a",
          zeroLine: "#30363D",
          lineGlow: "rgba(253, 231, 37, 0.24)",
          buttonBorder: "#3A3D47",
          buttonText: "#C3C8D4",
          buttonHover: "#E8EAF0",
          narrativeBg: "#161921",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E1E4E8",
          title: "#0D1117",
          subText: "#57606A",
          gridMajor: "rgba(27, 31, 35, 0.08)",
          gridMinor: "rgba(27, 31, 35, 0.04)",
          axis: "#0D1117",
          linePrimary: "#440154",
          lineAccent: "#440154",
          lineHighlight: "#440154",
          comparePositive: "#6a8532",
          compareNegative: "#eb5e28",
          zeroLine: "#E5E7EB",
          lineGlow: "rgba(68, 1, 84, 0.16)",
          buttonBorder: "#D0D3DA",
          buttonText: "#4B4E59",
          buttonHover: "#1A1A1A",
          narrativeBg: "#F8F9FC",
        };

  const orderedChartData = [...chartData].sort(
    (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at),
  );
  const periodStart = orderedChartData[0]?.recorded_at;
  const periodEnd = orderedChartData[orderedChartData.length - 1]?.recorded_at;
  const periodLabel =
    periodStart && periodEnd
      ? `${formatDateLong(periodStart)} - ${formatDateLong(periodEnd)} (${selectedTimeFilter})`
      : null;
  const lineData = orderedChartData
    .map((point) => ({
      ...point,
      numeric: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.numeric));
  const lineDomain = getDomain(lineData.map((point) => point.numeric));

  const compareData = orderedChartData;
  const compareLineData = compareData
    .map((point) => ({
      ...point,
      numeric: Number(point.result),
    }))
    .filter((point) => Number.isFinite(point.numeric));
  const compareDomain = getDomain(compareLineData.map((point) => point.numeric));

  const activeData = mode === "single" ? lineData : compareLineData;
  const activeDomain = mode === "single" ? lineDomain : compareDomain;
  const yAxis = buildYAxisTicks(activeDomain, 8);
  const plotDomain = { min: yAxis.min, max: yAxis.max };

  const getTickStep = (length) => {
    if (selectedTimeFilter === "30 Days") return 4;
    if (selectedTimeFilter === "Year") return 30;
    if (selectedTimeFilter === "Month to Date") return 3;
    if (selectedTimeFilter === "Year to Date") return 30;
    if (length <= 10) return 1;
    return Math.max(2, Math.floor(length / 6));
  };

  const lineTickStep = getTickStep(lineData.length);
  const compareTickStep = getTickStep(compareLineData.length);
  const getMinGapPercent = () => {
    if (selectedTimeFilter === "30 Days") return 10;
    if (selectedTimeFilter === "Year") return 7;
    if (selectedTimeFilter === "Month to Date") return 10;
    if (selectedTimeFilter === "Year to Date") return 7;
    return 8;
  };

  const lineTicks = buildTickLabels(lineData, lineTickStep, getMinGapPercent());
  const compareTicks = buildTickLabels(compareLineData, compareTickStep, getMinGapPercent());
  const activeTicks = mode === "single" ? lineTicks : compareTicks;
  const selectedVariableLabel = variables.find((v) => v.id === selectedVariable1)?.name;
  const comparisonLabel =
    calculatedData[0] &&
    `${calculatedData[0].variable1_name} − ${calculatedData[0].variable2_name}`;
  const analysisLabel = mode === "single" ? selectedVariableLabel : comparisonLabel;

  const linePath = buildLinePath(lineData, plotDomain);
  const comparePath = buildLinePath(compareLineData, plotDomain);
  const compareSegments = buildCompareSegments(compareLineData, plotDomain);
  const quantitativeNarration = buildQuantitativeNarration(stats, mode, activeData);
  const narrationCopyText = quantitativeNarration ? `Quantitative analysis: ${quantitativeNarration}` : "";

  const copyQuantitativeNarration = async () => {
    if (!narrationCopyText) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(narrationCopyText);
        setCopyFeedback("Copied");
        window.setTimeout(() => setCopyFeedback(""), 1500);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = narrationCopyText;
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
  const hoverData = hoveredIndex !== null ? activeData[hoveredIndex] : null;
  const hoverPoint = hoveredIndex !== null ? getPointCoordinates(activeData, hoveredIndex, plotDomain) : null;

  const handleChartMouseMove = (event) => {
    if (!activeData.length) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) {
      return;
    }

    const ratio = (event.clientX - rect.left) / rect.width;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const index = Math.round(clampedRatio * Math.max(1, activeData.length - 1));
    setHoveredIndex(index);
  };

  const handleChartMouseLeave = () => {
    setHoveredIndex(null);
  };

  const downloadChart = async () => {

    const svgElement = chartSvgRef.current;
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    if (!svgString.includes("xmlns=\"http://www.w3.org/2000/svg\"")) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const [ratioWidth, ratioHeight] = EXPORT_RATIO_MAP[exportRatio] || EXPORT_RATIO_MAP["16:9"];
    const baseWidth = 2200;
    const composedWidth = baseWidth;
    const composedHeight = Math.round((baseWidth * ratioHeight) / ratioWidth);
    const paddingLeft = Math.round(composedWidth * 0.1);
    const paddingRight = Math.round(composedWidth * 0.04);
    const plotTop = Math.round(composedHeight * 0.24);
    const plotHeight = Math.round(composedHeight * 0.6);
    const plotWidth = composedWidth - paddingLeft - paddingRight;
    const plotBottom = plotTop + plotHeight;

    const titleText = mode === "single" ? "Single-Series Analysis" : "Relative-Value Analysis";
    const contextText = analysisLabel || "";
    const subtitleText = periodLabel ? `Period: ${periodLabel}` : "";

    const encodedInnerSvg = toBase64Utf8(svgString);
    const yTickText = yAxis.ticks
      .map((tick) => {
        const y = plotTop + (tick.topPercent / 100) * plotHeight;
        return `<text x="${paddingLeft - 24}" y="${y + 8}" text-anchor="end" font-size="22" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.axis}">${escapeXml(tick.label)}</text>`;
      })
      .join("");

    const xTickText = activeTicks
      .map((tick, index) => {
        const x = paddingLeft + (tick.leftPercent / 100) * plotWidth;
        const anchor = index === 0 ? "start" : index === activeTicks.length - 1 ? "end" : "middle";
        const safeX =
          index === 0
            ? Math.max(paddingLeft, x)
            : index === activeTicks.length - 1
              ? Math.min(composedWidth - paddingRight, x)
              : x;
        return `<text x="${safeX}" y="${plotBottom + 58}" text-anchor="${anchor}" font-size="22" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.axis}">${escapeXml(tick.label)}</text>`;
      })
      .join("");

    const composedSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${composedWidth}" height="${composedHeight}" viewBox="0 0 ${composedWidth} ${composedHeight}">
        <rect width="100%" height="100%" fill="${palette.cardBg}" />
        <text x="${paddingLeft}" y="${Math.round(composedHeight * 0.08)}" font-size="44" font-weight="600" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.title}">${escapeXml(titleText)}</text>
        ${contextText ? `<text x="${paddingLeft}" y="${Math.round(composedHeight * 0.13)}" font-size="26" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.subText}">${escapeXml(contextText)}</text>` : ""}
        ${subtitleText ? `<text x="${paddingLeft}" y="${Math.round(composedHeight * 0.17)}" font-size="24" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" fill="${palette.subText}">${escapeXml(subtitleText)}</text>` : ""}
        <image href="data:image/svg+xml;base64,${encodedInnerSvg}" x="${paddingLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" preserveAspectRatio="none" />
        ${yTickText}
        ${xTickText}
      </svg>
    `;

    const filenameBase = `chart-${mode}-${new Date().toISOString().slice(0, 10)}`;

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
        const pdf = new jsPDF({
          orientation,
          unit: "px",
          format: [composedWidth, composedHeight],
        });
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
    <div
      className="rounded-lg p-4 md:p-6 mb-3 md:mb-4"
      style={{
        minHeight: "420px",
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: palette.title }}>
            {mode === "single" ? "Single-Series Analysis" : "Relative-Value Analysis"}
          </h3>

          <div className="flex items-center gap-2">
            {chartData.length > 0 && !loading && (
              <>
                <select
                  value={exportRatio}
                  onChange={(event) => setExportRatio(event.target.value)}
                  className="h-[30px] px-2 rounded-md border text-[11px] bg-transparent"
                  style={{ borderColor: palette.buttonBorder, color: palette.buttonText }}
                  aria-label="Select chart ratio"
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
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="svg">SVG</option>
                  <option value="pdf">PDF</option>
                </select>

                <button
                  onClick={downloadChart}
                  className="h-[30px] px-3 rounded-md border text-[11px] font-medium transition-colors flex items-center gap-1.5"
                  style={{
                    borderColor: palette.buttonBorder,
                    color: palette.buttonText,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = palette.buttonHover;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = palette.buttonText;
                  }}
                >
                  <Download size={12} />
                  Download
                </button>
              </>
            )}
            <BarChart3 size={16} strokeWidth={1.5} style={{ color: palette.linePrimary }} opacity={0.6} />
          </div>
        </div>

        {calculatedData.length > 0 && analysisLabel && (
          <div className="text-[12px] mt-1 font-normal" style={{ color: palette.subText }}>
            {analysisLabel}
          </div>
        )}
        {periodLabel && (
          <div className="text-[11px] mt-2 font-light" style={{ color: palette.subText }}>
            {periodLabel}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-[14px]" style={{ color: palette.subText }}>Loading...</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-[14px]" style={{ color: palette.subText }}>
            {mode === "single"
              ? "Select an indicator to see analysis"
              : "Select two indicators to see results"}
          </div>
        </div>
      ) : (
        <div className="relative h-[280px] mb-0">
          {/* Grid lines with refined styling */}
          <div className="absolute left-12 md:left-14 right-0 top-0 bottom-6">
            {yAxis.ticks.map((tick, index) => {
              const isMajor = index % 2 === 0;
              return (
                <div
                  key={`grid-${index}`}
                  className="absolute w-full border-t"
                  style={{
                    top: `${tick.topPercent}%`,
                    borderTopColor: isMajor ? palette.gridMajor : palette.gridMinor,
                    borderTopStyle: isMajor ? "solid" : "dotted",
                    borderTopWidth: isMajor ? "1px" : "1px",
                  }}
                />
              );
            })}
          </div>

          {/* Y-axis labels */}
          <div 
            className="absolute left-0 top-0 bottom-6 w-12 text-[13px] font-light" 
            style={{ color: palette.axis }}
          >
            {yAxis.ticks.map((tick) => (
              <span
                key={`y-${tick.topPercent}`}
                className="absolute right-0 w-full pr-3 text-right tracking-tight leading-none"
                style={{ top: `${tick.topPercent}%`, transform: "translateY(-50%)" }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          {/* Chart area with SVG */}
          <div className="absolute left-12 md:left-14 right-0 top-0 bottom-6 px-2 md:px-4">
            <svg
              ref={chartSvgRef}
              viewBox="0 0 1000 240"
              className="w-full h-full"
              preserveAspectRatio="none"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <defs>
                {/* Gradient for line */}
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={palette.lineAccent} />
                  <stop offset="50%" stopColor={palette.linePrimary} />
                  <stop offset="100%" stopColor={palette.lineHighlight} />
                </linearGradient>
                {/* Glow filter for line */}
                <filter id="lineGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Zero line for compare mode */}
              {mode === "compare" && activeDomain.min <= 0 && activeDomain.max >= 0 && (
                <line
                  x1={CHART_X_PADDING_PX}
                  y1={CHART_HEIGHT - ((0 - plotDomain.min) / Math.max(1e-9, plotDomain.max - plotDomain.min)) * CHART_HEIGHT}
                  x2={CHART_WIDTH - CHART_X_PADDING_PX}
                  y2={CHART_HEIGHT - ((0 - plotDomain.min) / Math.max(1e-9, plotDomain.max - plotDomain.min)) * CHART_HEIGHT}
                  stroke={palette.zeroLine}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              )}
              
              {/* Area fill under line */}
              {activeData.length > 0 && (
                <path
                  d={`M ${CHART_X_PADDING_PX},${CHART_HEIGHT} L ${buildLinePath(activeData, plotDomain)} L ${CHART_WIDTH - CHART_X_PADDING_PX},${CHART_HEIGHT} Z`}
                  fill={palette.lineGlow}
                  opacity="0.5"
                />
              )}
              
              {/* Main data line */}
              {mode === "single" ? (
                <polyline
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="2.5"
                  opacity="0.9"
                  points={linePath}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  filter="url(#lineGlow)"
                />
              ) : (
                compareSegments.map((segment, index) => (
                  <polyline
                    key={`compare-segment-${index}`}
                    fill="none"
                    stroke={segment.positive ? palette.comparePositive : palette.compareNegative}
                    strokeWidth="2.5"
                    opacity="0.95"
                    points={segment.points}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))
              )}

              {hoverPoint && (
                <>
                  <line
                    x1={hoverPoint.x}
                    y1="0"
                    x2={hoverPoint.x}
                    y2={CHART_HEIGHT}
                    stroke={palette.subText}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.6"
                  />
                  <circle
                    cx={hoverPoint.x}
                    cy={hoverPoint.y}
                    r="4.5"
                    fill={mode === "single" ? palette.linePrimary : (hoverData?.numeric ?? 0) >= 0 ? palette.comparePositive : palette.compareNegative}
                    stroke={palette.cardBg}
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>

            {hoverPoint && hoverData && (
              <div
                className="absolute pointer-events-none z-10 rounded-md border px-2 py-1 text-[11px] leading-snug"
                style={{
                  left: `${Math.max(8, Math.min(92, (hoverPoint.x / CHART_WIDTH) * 100))}%`,
                  top: `${Math.max(4, (hoverPoint.y / CHART_HEIGHT) * 100 - 14)}%`,
                  transform: "translate(-50%, -100%)",
                  backgroundColor: palette.cardBg,
                  borderColor: palette.border,
                  color: palette.title,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                <div style={{ color: palette.subText }}>{formatDateLong(hoverData.recorded_at)}</div>
                <div className="font-medium">
                  {mode === "single" ? "Value" : "Difference"}: {formatNumber(hoverData.numeric, 2)}
                </div>
              </div>
            )}
          </div>

          {/* X-axis labels */}
          <div 
            className="absolute left-12 md:left-14 right-6 md:right-8 text-[12px] font-light pointer-events-none" 
            style={{ color: palette.axis, bottom: "5px" }}
          >
            {(mode === "single" ? lineTicks : compareTicks).map((tick) => (
              <span
                key={tick.key}
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${tick.leftPercent}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && chartData.length > 0 && quantitativeNarration && (
        <div
          className="mt-4 rounded-md px-3 py-2 text-[12px] leading-relaxed"
          style={{
            backgroundColor: palette.narrativeBg,
            color: palette.subText,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span style={{ color: palette.title }} className="font-medium">Quantitative analysis:</span>
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
          <div>{quantitativeNarration}</div>
        </div>
      )}
    </div>
  );
}
