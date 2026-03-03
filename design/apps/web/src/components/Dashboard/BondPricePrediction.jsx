import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Play, AlertCircle, Download } from "lucide-react";

const RESULT_STORAGE_KEY = "bond-prediction:last-result";
const PREDICTION_MODELS = [
  { key: "Quantile", label: "Quantile" },
  { key: "LightGBM", label: "LightGBM" },
  { key: "XGBoost", label: "XGBoost" },
  { key: "CatBoost", label: "CatBoost" },
  { key: "RandomForest", label: "Random Forest" },
  { key: "StepwiseOLS", label: "Stepwise OLS" },
  { key: "QuantileReg", label: "Quantile Reg (τ=0.5)" },
];

function formatMetric(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(digits);
}

function formatPrediction(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${value.toFixed(4)}%`;
}

function computeAverageExcludingOutlier(row) {
  const modelValues = PREDICTION_MODELS.map(({ key }) => ({ key, value: Number(row?.[key]) })).filter(({ value }) => Number.isFinite(value));

  if (modelValues.length === 0) {
    return null;
  }

  if (modelValues.length === 1) {
    return modelValues[0].value;
  }

  const sortedValues = modelValues.map(({ value }) => value).sort((a, b) => a - b);
  const mid = Math.floor(sortedValues.length / 2);
  const median =
    sortedValues.length % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];

  let outlierIndex = 0;
  let maxDeviation = -1;
  for (let index = 0; index < modelValues.length; index += 1) {
    const deviation = Math.abs(modelValues[index].value - median);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      outlierIndex = index;
    }
  }

  const includedValues = modelValues.filter((_, index) => index !== outlierIndex).map(({ value }) => value);
  if (includedValues.length === 0) {
    return null;
  }

  return includedValues.reduce((sum, value) => sum + value, 0) / includedValues.length;
}

function formatSeriesLabel(code) {
  const raw = String(code || "").trim().toLowerCase();
  if (!raw) {
    return "-";
  }

  const spnMatch = raw.match(/^spn(\d+)([a-z])$/i);
  if (spnMatch) {
    const [, tenorDigits, unit] = spnMatch;
    const paddedTenor = tenorDigits.padStart(2, "0");
    return `SPN ${paddedTenor}${unit.toUpperCase()}`;
  }

  const bmMatch = raw.match(/^bm(\d+)$/i);
  if (bmMatch) {
    const [, tenorDigits] = bmMatch;
    const paddedTenor = tenorDigits.padStart(2, "0");
    return `FR ${paddedTenor}Y`;
  }

  return raw.toUpperCase();
}

export function BondPricePrediction({ theme = "dark" }) {
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const focusTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const palette =
    theme === "dark"
      ? {
          cardBg: "#171A22",
          border: "#343A46",
          title: "#E8EAF0",
          subText: "#C2C8D3",
          inputBg: "#1E222D",
          inputText: "#DCE2EF",
          buttonBg: "#2962FF",
          buttonText: "#FFFFFF",
          mutedBg: "#1D2130",
          mutedText: "#9CA8BD",
          dangerBg: "rgba(239, 68, 68, 0.12)",
          dangerBorder: "rgba(239, 68, 68, 0.4)",
          dangerText: "#FCA5A5",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E4E6EB",
          title: "#1A1A1A",
          subText: "#6B7280",
          inputBg: "#F7F8FA",
          inputText: "#1F2937",
          buttonBg: "#2962FF",
          buttonText: "#FFFFFF",
          mutedBg: "#F3F4F6",
          mutedText: "#6B7280",
          dangerBg: "#FEF2F2",
          dangerBorder: "#FECACA",
          dangerText: "#B91C1C",
        };

  const sortedMetrics = useMemo(() => {
    const rows = Array.isArray(result?.modelMetrics) ? result.modelMetrics : [];
    return [...rows].sort((a, b) => {
      const maeA = Number.isFinite(a?.mae) ? a.mae : Number.POSITIVE_INFINITY;
      const maeB = Number.isFinite(b?.mae) ? b.mae : Number.POSITIVE_INFINITY;
      return maeA - maeB;
    });
  }, [result]);

  const sortedPredictions = useMemo(() => {
    const rows = Array.isArray(result?.predictions) ? result.predictions : [];
    return [...rows].sort((left, right) => {
      const leftCode = String(left?.code || "").toLowerCase();
      const rightCode = String(right?.code || "").toLowerCase();

      const rank = (code) => {
        if (code.startsWith("spn")) {
          return 0;
        }
        if (code.startsWith("bm")) {
          return 1;
        }
        return 2;
      };

      const leftRank = rank(leftCode);
      const rightRank = rank(rightCode);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftTenor = Number(left?.tenor);
      const rightTenor = Number(right?.tenor);
      const leftTenorSafe = Number.isFinite(leftTenor) ? leftTenor : Number.POSITIVE_INFINITY;
      const rightTenorSafe = Number.isFinite(rightTenor) ? rightTenor : Number.POSITIVE_INFINITY;
      if (leftTenorSafe !== rightTenorSafe) {
        return leftTenorSafe - rightTenorSafe;
      }

      return leftCode.localeCompare(rightCode);
    });
  }, [result]);

  const quantitativeSummary = useMemo(() => {
    const metrics = sortedMetrics;
    const rows = sortedPredictions;

    if (!metrics.length) {
      return null;
    }

    const topModel = metrics[0];
    const bottomModel = metrics[metrics.length - 1];

    const spreads = rows
      .map((row) => {
        const values = PREDICTION_MODELS.map(({ key }) => row[key])
          .map((value) => (Number.isFinite(value) ? value : null))
          .filter((value) => value != null);
        if (values.length < 2) {
          return null;
        }
        return Math.max(...values) - Math.min(...values);
      })
      .filter((value) => value != null);

    const avgSpread = spreads.length
      ? spreads.reduce((sum, value) => sum + value, 0) / spreads.length
      : null;
    const maxSpread = spreads.length ? Math.max(...spreads) : null;

    return {
      topModel,
      bottomModel,
      avgSpread,
      maxSpread,
      seriesCount: rows.length,
    };
  }, [sortedMetrics, sortedPredictions]);

  const downloadPredictionCsv = () => {
    const rows = Array.isArray(result?.predictions) ? result.predictions : [];
    if (rows.length === 0) {
      return;
    }

    const headers = ["series", ...PREDICTION_MODELS.map(({ key }) => key), "average_excl_outlier"];
    const csvRows = [headers.join(",")];

    for (const row of rows) {
      const values = [
        formatSeriesLabel(row.code),
        ...PREDICTION_MODELS.map(({ key }) => (Number.isFinite(row[key]) ? Number(row[key]).toFixed(6) : "")),
        Number.isFinite(computeAverageExcludingOutlier(row)) ? computeAverageExcludingOutlier(row).toFixed(6) : "",
      ];
      csvRows.push(values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bond-predictions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!result) {
      window.sessionStorage.removeItem(RESULT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
  }, [result]);

  const handleGenerate = async () => {
    if (!file) {
      setErrorMessage("Please upload a CSV file first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/bond-prediction", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || "Failed to generate predictions.");
      }

      setResult(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate predictions.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setErrorMessage("");

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RESULT_STORAGE_KEY);
    }

    if (focusTimeoutRef.current) {
      window.clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section
      className="rounded-xl border p-4 md:p-5"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.cardBg,
      }}
    >
      <div className="mb-4">
        <h2 className="text-[18px] font-semibold" style={{ color: palette.title }}>
          Bond Price Prediction
        </h2>
        <p className="mt-1 text-[12px]" style={{ color: palette.subText }}>
          Upload a CSV with the trained feature set, then generate owner estimate predictions from all saved models.
        </p>
      </div>

      <div className="mb-4 rounded-lg border p-3 md:p-4" style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label
            className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[12px]"
            style={{ borderColor: palette.border, backgroundColor: palette.inputBg, color: palette.inputText }}
          >
            <Upload size={14} />
            <span>{file ? file.name : "Choose CSV file"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] || null;
                setFile(selectedFile);
                setErrorMessage("");
              }}
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={!file && !result && !errorMessage}
              className="h-[34px] rounded-md px-4 text-[12px] font-medium border transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: palette.border,
                color: palette.inputText,
                backgroundColor: palette.cardBg,
              }}
            >
              Reset
            </button>
            <button
              onClick={handleGenerate}
              disabled={!file || isSubmitting}
              className="h-[34px] rounded-md px-4 text-[12px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: palette.buttonBg, color: palette.buttonText }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Play size={13} />
                {isSubmitting ? "Generating..." : "Generate"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]"
          style={{
            backgroundColor: palette.dangerBg,
            borderColor: palette.dangerBorder,
            color: palette.dangerText,
          }}
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="mb-4 overflow-x-auto rounded-lg border" style={{ borderColor: palette.border }}>
            <div
              className="px-3 py-2 text-[12px] font-semibold flex items-center justify-between gap-2"
              style={{ color: palette.title, backgroundColor: palette.mutedBg }}
            >
              <span>Model Reliability (Holdout: Last Pricing Date)</span>
            </div>
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr style={{ color: palette.subText }}>
                  <th className="px-3 py-2 text-left font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">MAE</th>
                  <th className="px-3 py-2 text-right font-medium">RMSE</th>
                  <th className="px-3 py-2 text-right font-medium">MAPE</th>
                  <th className="px-3 py-2 text-right font-medium">Sample</th>
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((metric) => (
                  <tr key={metric.model} className="border-t" style={{ borderTopColor: palette.border, color: palette.inputText }}>
                    <td className="px-3 py-2">{metric.model || "n/a"}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(metric.mae, 4)}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(metric.rmse, 4)}</td>
                    <td className="px-3 py-2 text-right">{Number.isFinite(metric.mape) ? `${metric.mape.toFixed(2)}%` : "n/a"}</td>
                    <td className="px-3 py-2 text-right">{metric.sampleSize ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: palette.border }}>
            <div
              className="px-3 py-2 text-[12px] font-semibold flex items-center justify-between gap-2"
              style={{ color: palette.title, backgroundColor: palette.mutedBg }}
            >
              <span>Prediction Results by Series</span>
              <button
                onClick={downloadPredictionCsv}
                className="h-[28px] rounded-md px-2.5 text-[11px] font-medium border inline-flex items-center gap-1.5"
                style={{ borderColor: palette.border, color: palette.inputText, backgroundColor: palette.cardBg }}
              >
                <Download size={12} />
                Download CSV
              </button>
            </div>
            <table className="w-full min-w-[980px] text-[12px]">
              <thead>
                <tr style={{ color: palette.subText }}>
                  <th className="px-3 py-2 text-left font-medium">Series</th>
                  {PREDICTION_MODELS.map((model) => (
                    <th key={model.key} className="px-3 py-2 text-right font-medium">{model.label}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Average (Excl. Outlier)</th>
                </tr>
              </thead>
              <tbody>
                {sortedPredictions.map((row, index) => (
                  <tr key={`${row.code || "series"}-${index}`} className="border-t" style={{ borderTopColor: palette.border, color: palette.inputText }}>
                    <td className="px-3 py-2 font-medium">{formatSeriesLabel(row.code)}</td>
                    {PREDICTION_MODELS.map((model) => (
                      <td key={model.key} className="px-3 py-2 text-right">{formatPrediction(row[model.key])}</td>
                    ))}
                    <td className="px-3 py-2 text-right">{formatPrediction(computeAverageExcludingOutlier(row))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="mt-3 rounded-lg border px-3 py-2 text-[11px]"
            style={{ borderColor: palette.border, backgroundColor: palette.mutedBg, color: palette.subText }}
          >
            <p className="font-semibold" style={{ color: palette.title }}>How each model works</p>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li><strong>Quantile:</strong> predicts the middle (median) expected owner estimate, making it less sensitive to extreme values.</li>
              <li><strong>LightGBM:</strong> builds many small decision trees in sequence, where each new tree corrects mistakes from earlier trees.</li>
              <li><strong>XGBoost:</strong> another boosted-tree method that focuses on reducing prediction error step by step with strong regularization.</li>
              <li><strong>CatBoost:</strong> gradient boosting designed to handle complex feature interactions robustly, especially when data patterns are nonlinear.</li>
              <li><strong>Random Forest:</strong> averages predictions from many independent trees trained on different samples to improve stability.</li>
              <li><strong>Stepwise OLS:</strong> a linear regression that automatically adds/removes features based on statistical significance.</li>
              <li><strong>Quantile Reg (τ=0.5):</strong> a linear median-regression method that estimates the 50th percentile instead of mean.</li>
              <li><strong>Average (Excl. Outlier):</strong> combines model predictions after removing the single most divergent model value.</li>
            </ul>
          </div>

          {quantitativeSummary ? (
            <div
              className="mt-3 rounded-lg border px-3 py-2 text-[11px]"
              style={{ borderColor: palette.border, backgroundColor: palette.mutedBg, color: palette.subText }}
            >
              <p>
                Across {quantitativeSummary.seriesCount} series, {quantitativeSummary.topModel.model} ranks lowest on MAE
                ({formatMetric(quantitativeSummary.topModel.mae, 4)}), RMSE ({formatMetric(quantitativeSummary.topModel.rmse, 4)}), and
                MAPE ({Number.isFinite(quantitativeSummary.topModel.mape) ? `${quantitativeSummary.topModel.mape.toFixed(2)}%` : "n/a"}).
                The highest MAE in this run is {quantitativeSummary.bottomModel.model} at {formatMetric(quantitativeSummary.bottomModel.mae, 4)}.
                Cross-model dispersion per series averages {Number.isFinite(quantitativeSummary.avgSpread) ? `${quantitativeSummary.avgSpread.toFixed(4)}%` : "n/a"}
                {Number.isFinite(quantitativeSummary.maxSpread)
                  ? `, with a maximum spread of ${quantitativeSummary.maxSpread.toFixed(4)}%.`
                  : "."}
              </p>
            </div>
          ) : null}

          <p className="mt-3 text-[11px]" style={{ color: palette.mutedText }}>
            Reliability metrics are shown for all models on a holdout split, where the latest pricing date is used as test data. The Average (Excl. Outlier) column is an ensemble benchmark computed after removing the single most divergent model prediction.
          </p>
        </>
      ) : null}
    </section>
  );
}
