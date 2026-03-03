export function calculateStats(calculatedData, mode = "compare") {
  if (calculatedData.length === 0)
    return {
      total: 0,
      average: 0,
      median: 0,
      stdDev: 0,
      variance: 0,
      min: 0,
      max: 0,
      latestValue: 0,
      trend: "neutral",
      correlation: 0,
      volatility: 0,
    };

  let values, var1Values, var2Values;

  if (mode === "single") {
    values = calculatedData.map((d) => d.value);
  } else {
    values = calculatedData.map((d) => d.result);
    var1Values = calculatedData.map((d) => d.value1);
    var2Values = calculatedData.map((d) => d.value2);
  }

  const n = values.length;

  // Basic stats
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latestRow = [...calculatedData].sort(
    (a, b) => new Date(b.recorded_at) - new Date(a.recorded_at),
  )[0];
  const latestValue =
    mode === "single"
      ? Number(latestRow?.value)
      : Number(latestRow?.result);

  // Median
  const sortedValues = [...values].sort((a, b) => a - b);
  const median =
    n % 2 === 0
      ? (sortedValues[n / 2 - 1] + sortedValues[n / 2]) / 2
      : sortedValues[Math.floor(n / 2)];

  // Variance and Standard Deviation
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Volatility (coefficient of variation)
  const volatility = average !== 0 ? (stdDev / Math.abs(average)) * 100 : 0;

  // Correlation coefficient (only for compare mode)
  let correlation = 0;
  if (mode === "compare" && var1Values && var2Values) {
    const mean1 = var1Values.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = var2Values.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = var1Values[i] - mean1;
      const diff2 = var2Values[i] - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    correlation = numerator / Math.sqrt(sum1Sq * sum2Sq);
  }

  // Trend analysis
  const midpoint = Math.floor(n / 2);
  const firstHalf =
    values.slice(0, midpoint).reduce((sum, val) => sum + val, 0) / midpoint;
  const secondHalf =
    values.slice(midpoint).reduce((sum, val) => sum + val, 0) / (n - midpoint);
  const trend =
    secondHalf > firstHalf
      ? "positive"
      : secondHalf < firstHalf
        ? "negative"
        : "neutral";

  return {
    total,
    average,
    median,
    stdDev,
    variance,
    min,
    max,
    latestValue: Number.isFinite(latestValue) ? latestValue : 0,
    trend,
    correlation: isNaN(correlation) ? 0 : correlation,
    volatility,
  };
}
