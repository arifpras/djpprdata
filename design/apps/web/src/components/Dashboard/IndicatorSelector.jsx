import React, { useMemo } from "react";
import { Minus } from "lucide-react";

export function IndicatorSelector({
  theme = "light",
  mode,
  variables,
  selectedVariable1,
  selectedVariable2,
  onVariable1Change,
  onVariable2Change,
  error,
}) {
  const palette =
    theme === "dark"
      ? {
          cardBg: "#181A20",
          border: "#2A2D36",
          title: "#E8EAF0",
          label: "#AEB4C2",
          inputBg: "#1B1D24",
          inputBorder: "#3A3D47",
          inputText: "#E8EAF0",
          minusBg: "#232734",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          title: "#1A1A1A",
          label: "#8F93A1",
          inputBg: "#FFFFFF",
          inputBorder: "#E4E6EB",
          inputText: "#1A1A1A",
          minusBg: "#F5F6F9",
        };

  const sortedVariables = useMemo(() => {
    return [...variables].sort((left, right) => {
      const leftName = String(left?.name || "");
      const rightName = String(right?.name || "");
      const byName = leftName.localeCompare(rightName, undefined, {
        sensitivity: "base",
      });

      if (byName !== 0) {
        return byName;
      }

      const leftUnit = String(left?.unit || "");
      const rightUnit = String(right?.unit || "");
      return leftUnit.localeCompare(rightUnit, undefined, {
        sensitivity: "base",
      });
    });
  }, [variables]);

  return (
    <div
      className="rounded-lg p-4 md:p-6 mb-6 md:mb-8"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <h3 className="text-[14px] font-medium mb-4" style={{ color: palette.title }}>
        {mode === "single"
          ? "Select Indicator"
          : "Select Indicators to Compare"}
      </h3>

      {mode === "single" ? (
        <div>
          <label className="text-[12px] mb-2 block" style={{ color: palette.label }}>
            Economic Indicator
          </label>
          <select
            value={selectedVariable1 || ""}
            onChange={(e) => onVariable1Change(e.target.value)}
            className="w-full h-[40px] px-4 border rounded-lg text-[14px] outline-none"
            style={{
              backgroundColor: palette.inputBg,
              borderColor: palette.inputBorder,
              color: palette.inputText,
            }}
          >
            <option value="">Select indicator...</option>
            {sortedVariables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.unit ? `${v.name} (${v.unit})` : v.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-[12px] mb-2 block" style={{ color: palette.label }}>
              Indicator 1
            </label>
            <select
              value={selectedVariable1 || ""}
              onChange={(e) => onVariable1Change(e.target.value)}
              className="w-full h-[40px] px-4 border rounded-lg text-[14px] outline-none"
              style={{
                backgroundColor: palette.inputBg,
                borderColor: palette.inputBorder,
                color: palette.inputText,
              }}
            >
              <option value="">Select indicator...</option>
              {sortedVariables.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.unit ? `${v.name} (${v.unit})` : v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <div
              className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
              style={{ backgroundColor: palette.minusBg }}
            >
              <Minus className="text-[20px] text-[#2962FF]" />
            </div>
          </div>

          <div>
            <label className="text-[12px] mb-2 block" style={{ color: palette.label }}>
              Indicator 2
            </label>
            <select
              value={selectedVariable2 || ""}
              onChange={(e) => onVariable2Change(e.target.value)}
              className="w-full h-[40px] px-4 border rounded-lg text-[14px] outline-none"
              style={{
                backgroundColor: palette.inputBg,
                borderColor: palette.inputBorder,
                color: palette.inputText,
              }}
            >
              <option value="">Select indicator...</option>
              {sortedVariables.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.unit ? `${v.name} (${v.unit})` : v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-[#FEE] border border-[#FCC] rounded-lg text-[12px] text-[#C00]">
          {error}
        </div>
      )}
    </div>
  );
}
