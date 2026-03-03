import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "-";
}

function formatDateLong(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DataTable({
  calculatedData,
  mode,
  variables,
  selectedVariable1,
  selectedTimeFilter = "All Time",
  theme = "light",
}) {
  const [visibleRows, setVisibleRows] = useState(10);

  useEffect(() => {
    setVisibleRows(10);
  }, [calculatedData, mode, selectedVariable1]);

  if (calculatedData.length === 0) return null;

  const orderedRows = [...calculatedData].sort(
    (a, b) => new Date(b.recorded_at) - new Date(a.recorded_at),
  );
  const periodStart = orderedRows[orderedRows.length - 1]?.recorded_at;
  const periodEnd = orderedRows[0]?.recorded_at;
  const periodLabel =
    periodStart && periodEnd
      ? `${formatDateLong(periodStart)} - ${formatDateLong(periodEnd)} (${selectedTimeFilter})`
      : null;

  const palette =
    theme === "dark"
      ? {
          cardBg: "#181A20",
          border: "#2A2D36",
          headText: "#AEB4C2",
          bodyText: "#E8EAF0",
          rowBorder: "#2A2D36",
          comparePositive: "#a8dadc",
          compareNegative: "#ec9a9a",
          buttonBorder: "#3A3D47",
          buttonText: "#C3C8D4",
          buttonHover: "#E8EAF0",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          headText: "#8F93A1",
          bodyText: "#1A1A1A",
          rowBorder: "#E4E6EB",
          comparePositive: "#6a8532",
          compareNegative: "#eb5e28",
          buttonBorder: "#D0D3DA",
          buttonText: "#4B4E59",
          buttonHover: "#1A1A1A",
        };

  const downloadTable = () => {
    const headers =
      mode === "single"
        ? [
            "Date",
            variables.find((v) => v.id === selectedVariable1)?.name || "Indicator",
            "Value",
          ]
        : [
            "Date",
            calculatedData[0]?.variable1_name || "Variable 1",
            calculatedData[0]?.variable2_name || "Variable 2",
            "Result",
          ];

    const escapeCell = (value) => {
      const stringValue = String(value ?? "");
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = orderedRows.map((row) =>
      mode === "single"
        ? [
            new Date(row.recorded_at).toLocaleDateString(),
            variables.find((v) => v.id === selectedVariable1)?.name || "",
            formatNumber(row.value),
          ]
        : [
            new Date(row.recorded_at).toLocaleDateString(),
            `${formatNumber(row.value1)} ${row.unit1 || ""}`.trim(),
            `${formatNumber(row.value2)} ${row.unit2 || ""}`.trim(),
            formatNumber(row.result),
          ],
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `table-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
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
      {periodLabel && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-medium" style={{ color: palette.bodyText }}>
              Data Table
            </div>
            <div className="text-[11px] mt-1" style={{ color: palette.headText }}>
              Period: {periodLabel}
            </div>
          </div>
          <button
            onClick={downloadTable}
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
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="h-[40px]">
              <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headText }}>
                Date
              </th>
              {mode === "single" ? (
                <>
                  <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headText }}>
                    {variables.find((v) => v.id === selectedVariable1)?.name}
                  </th>
                  <th className="text-center text-[12px] font-semibold tracking-wider" style={{ color: palette.headText }}>
                    Value
                  </th>
                </>
              ) : (
                <>
                  <th className="text-center text-[12px] font-semibold tracking-wider" style={{ color: palette.headText }}>
                    {calculatedData[0]?.variable1_name}
                  </th>
                  <th className="text-center text-[12px] font-semibold tracking-wider" style={{ color: palette.headText }}>
                    {calculatedData[0]?.variable2_name}
                  </th>
                  <th className="text-center text-[12px] font-semibold tracking-wider" style={{ color: palette.headText }}>
                    Result
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {orderedRows.slice(0, visibleRows).map((row, index) => (
              <tr key={index} className="border-t" style={{ borderTopColor: palette.rowBorder }}>
                <td className="py-3 text-[12px]" style={{ color: palette.bodyText }}>
                  {new Date(row.recorded_at).toLocaleDateString()}
                </td>
                {mode === "single" ? (
                  <>
                    <td className="py-3 text-[12px] text-center" style={{ color: palette.bodyText }}>
                      {variables.find((v) => v.id === selectedVariable1)?.name}
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-[12px] font-medium" style={{ color: palette.bodyText }}>
                        {formatNumber(row.value)}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 text-[12px] text-center" style={{ color: palette.bodyText }}>
                      {formatNumber(row.value1)} {row.unit1}
                    </td>
                    <td className="py-3 text-[12px] text-center" style={{ color: palette.bodyText }}>
                      {formatNumber(row.value2)} {row.unit2}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className="text-[12px] font-medium"
                        style={{
                          color:
                            Number(row.result) > 0
                              ? palette.comparePositive
                              : Number(row.result) < 0
                                ? palette.compareNegative
                                : palette.bodyText,
                        }}
                      >
                        {formatNumber(row.result)}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orderedRows.length > visibleRows && (
        <div className="flex justify-center mt-6">
          <button
            className="w-[120px] h-[32px] border rounded-[24px] text-[12px] font-medium transition-colors"
            style={{
              borderColor: palette.buttonBorder,
              color: palette.buttonText,
            }}
            onClick={() => setVisibleRows((previous) => previous + 10)}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = palette.buttonHover;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = palette.buttonText;
            }}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
