export function exportToCSV(
  calculatedData,
  stats,
  mode = "compare",
  variables = [],
  selectedVariable1 = null,
  selectedVariable2 = null,
) {
  if (calculatedData.length === 0) return;

  let headers, rows, fileName;

  if (mode === "single") {
    const varName =
      variables.find((v) => v.id === selectedVariable1)?.name || "Variable";
    const varUnit =
      variables.find((v) => v.id === selectedVariable1)?.unit || "";

    headers = ["Date", "Indicator", "Value"];
    rows = calculatedData.map((row) => [
      new Date(row.recorded_at).toLocaleDateString(),
      varName,
      row.value.toFixed(2) + (varUnit ? ` ${varUnit}` : ""),
    ]);
    fileName = `${varName}_${new Date().toISOString().split("T")[0]}.csv`;
  } else {
    const firstRow = calculatedData[0];
    headers = [
      "Date",
      firstRow?.variable1_name || "Indicator 1",
      firstRow?.variable2_name || "Indicator 2",
      "Result",
    ];
    rows = calculatedData.map((row) => [
      new Date(row.recorded_at).toLocaleDateString(),
      `${row.value1} ${row.unit1}`,
      `${row.value2} ${row.unit2}`,
      row.result.toFixed(2),
    ]);
    fileName = `${firstRow?.variable1_name}_minus_${firstRow?.variable2_name}_${new Date().toISOString().split("T")[0]}.csv`;
  }

  const summaryRows = [
    [],
    ["STATISTICAL ANALYSIS"],
    ["Mean", "", "", stats.average.toFixed(4)],
    ["Median", "", "", stats.median.toFixed(4)],
    ["Std Deviation", "", "", stats.stdDev.toFixed(4)],
    ["Variance", "", "", stats.variance.toFixed(4)],
    ["Min", "", "", stats.min.toFixed(2)],
    ["Max", "", "", stats.max.toFixed(2)],
    ["Range", "", "", (stats.max - stats.min).toFixed(2)],
    mode === "compare"
      ? ["Correlation", "", "", stats.correlation.toFixed(4)]
      : null,
    ["Trend", "", "", stats.trend],
    ["Volatility", "", "", stats.volatility.toFixed(1) + "%"],
  ].filter(Boolean);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
    ...summaryRows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
