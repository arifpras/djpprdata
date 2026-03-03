import React from "react";
import {
  Target,
  Activity,
  Sigma,
  Clock3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

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

export function StatisticsCards({ stats, mode, theme = "light" }) {
  const palette =
    theme === "dark"
      ? {
          cardBg: "#181A20",
          border: "#2A2D36",
          label: "#AEB4C2",
          value: "#E8EAF0",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          label: "#8F93A1",
          value: "#1A1A1A",
        };

  const cardStyle = {
    backgroundColor: palette.cardBg,
    border: `1px solid ${palette.border}`,
  };

  const helperStyle = { color: palette.label };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="flex items-center text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
          <Target size={12} className="mr-1" />
          Mean
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          What is the average level?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {formatNumber(stats.average, 2)}
        </div>
      </div>
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="flex items-center text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
          <Activity size={12} className="mr-1" />
          Median
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          What is the middle value?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {formatNumber(stats.median, 2)}
        </div>
      </div>
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="flex items-center text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
          <Sigma size={12} className="mr-1" />
          Std Dev
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          How much does it typically move?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {formatNumber(stats.stdDev, 2)}
        </div>
      </div>
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
          Min / Max
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          What are the lowest and highest values?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {formatNumber(stats.min, 2)} / {formatNumber(stats.max, 2)}
        </div>
      </div>
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="flex items-center text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
          <Clock3 size={12} className="mr-1" />
          Latest Value
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          What is the latest value?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {formatNumber(stats.latestValue, 2)}
        </div>
      </div>
      {mode === "single" && (
        <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
          <div className="text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
            Variance
          </div>
          <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
            How spread out are values squared?
          </div>
          <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
            {formatNumber(stats.variance, 2)}
          </div>
        </div>
      )}
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
          Volatility
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          How variable is it relative to its average?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {formatNumber(stats.volatility, 1)}%
        </div>
      </div>
      {mode === "compare" && (
        <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
          <div className="text-[11px] md:text-[12px] mb-1" style={{ color: palette.label }}>
            Correlation
          </div>
          <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
            How strongly do the two series move together?
          </div>
          <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
            {formatNumber(stats.correlation, 2)}
          </div>
        </div>
      )}
      <div className="rounded-lg p-3 md:p-4" style={cardStyle}>
        <div className="text-[11px] md:text-[12px] mb-1 flex items-center" style={{ color: palette.label }}>
          Trend
          {stats.trend === "positive" && (
            <TrendingUp size={14} className="ml-2" style={{ color: palette.label }} />
          )}
          {stats.trend === "negative" && (
            <TrendingDown size={14} className="ml-2" style={{ color: palette.label }} />
          )}
        </div>
        <div className="text-[10px] leading-tight mb-2" style={helperStyle}>
          Is the overall direction up, down, or stable?
        </div>
        <div className="text-[16px] md:text-[20px] font-medium text-center" style={{ color: palette.value }}>
          {stats.trend === "positive"
            ? "Up"
            : stats.trend === "negative"
              ? "Down"
              : "Stable"}
        </div>
      </div>
    </div>
  );
}
