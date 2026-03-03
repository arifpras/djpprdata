import { useState, useEffect } from "react";

export function useMacroeconomicData() {
  const [mode, setMode] = useState("single"); // 'single' or 'compare'
  const [variables, setVariables] = useState([]);
  const [selectedVariable1, setSelectedVariable1] = useState(null);
  const [selectedVariable2, setSelectedVariable2] = useState(null);
  const [calculatedData, setCalculatedData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  const syncStoredLabels = (variablesList) => {
    if (!Array.isArray(variablesList) || variablesList.length === 0) {
      return;
    }

    const nameById = new Map(
      variablesList.map((variable) => [String(variable.id), variable.name]),
    );

    setFavorites((previous) => {
      const updated = previous.map((favorite) => ({
        ...favorite,
        variable1Name:
          nameById.get(String(favorite.variable1Id)) || favorite.variable1Name,
        variable2Name: favorite.variable2Id
          ? nameById.get(String(favorite.variable2Id)) || favorite.variable2Name
          : null,
      }));
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });

    setRecentAnalyses((previous) => {
      const updated = previous.map((recent) => ({
        ...recent,
        variable1: recent.variable1
          ? {
              ...recent.variable1,
              name:
                nameById.get(
                  String(recent.variable1.id ?? recent.variable1Id ?? ""),
                ) || recent.variable1.name,
            }
          : recent.variable1,
        variable2: recent.variable2
          ? {
              ...recent.variable2,
              name:
                nameById.get(
                  String(recent.variable2.id ?? recent.variable2Id ?? ""),
                ) || recent.variable2.name,
            }
          : recent.variable2,
      }));
      localStorage.setItem("recentAnalyses", JSON.stringify(updated));
      return updated;
    });
  };

  // Load favorites and recent from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem("favorites");
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
    const storedRecent = localStorage.getItem("recentAnalyses");
    if (storedRecent) {
      setRecentAnalyses(JSON.parse(storedRecent));
    }
  }, []);

  const fetchVariables = async () => {
    try {
      const response = await fetch("/api/variables");
      if (!response.ok) {
        throw new Error(
          `Failed to fetch variables: [${response.status}] ${response.statusText}`,
        );
      }
      const data = await response.json();
      setVariables(data.variables);
      syncStoredLabels(data.variables);

      if (data.variables.length >= 2) {
        setSelectedVariable1(data.variables[0].id);
        setSelectedVariable2(data.variables[1].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load variables");
    }
  };

  const applyWindowFilter = (rows, selectedTimeFilter) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    if (selectedTimeFilter === "All Time" || selectedTimeFilter === "Custom") {
      return rows;
    }

    const sorted = [...rows].sort(
      (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at),
    );

    const latestDate = new Date(sorted[sorted.length - 1].recorded_at);
    if (Number.isNaN(latestDate.getTime())) {
      return sorted;
    }

    let startDate = null;

    if (selectedTimeFilter === "Year") {
      startDate = new Date(latestDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (selectedTimeFilter === "90 Days") {
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - 90);
    } else if (selectedTimeFilter === "30 Days") {
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - 30);
    } else if (selectedTimeFilter === "7 Days") {
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - 7);
    } else if (selectedTimeFilter === "Year to Date") {
      startDate = new Date(latestDate.getFullYear(), 0, 1);
    } else if (selectedTimeFilter === "Month to Date") {
      startDate = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
    }

    if (!startDate) {
      return sorted;
    }

    return sorted.filter((row) => {
      const rowDate = new Date(row.recorded_at);
      return !Number.isNaN(rowDate.getTime()) && rowDate >= startDate && rowDate <= latestDate;
    });
  };

  const performSingleVariableAnalysis = async (dateRange, selectedTimeFilter = "All Time") => {
    if (!selectedVariable1) {
      return;
    }

    setLoading(true);
    setError(null);
    setCalculatedData([]);
    setChartData([]);

    try {
      const query = new URLSearchParams({
        variableIds: String(selectedVariable1),
      });

      if (dateRange?.start) {
        query.set("startDate", dateRange.start);
      }

      if (dateRange?.end) {
        query.set("endDate", dateRange.end);
      }

      const response = await fetch(`/api/data-points?${query.toString()}`);

      if (!response.ok) {
        throw new Error(
          `Analysis failed: [${response.status}] ${response.statusText}`,
        );
      }

      const data = await response.json();
      const filtered = applyWindowFilter(data.dataPoints || [], selectedTimeFilter);
      setCalculatedData(filtered);
      setChartData(filtered);

      // Save to recent analyses
      saveToRecent({
        mode: "single",
        variable1: variables.find((v) => v.id === selectedVariable1),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      setError("Failed to analyze data");
    } finally {
      setLoading(false);
    }
  };

  const performCalculation = async (dateRange, selectedTimeFilter = "All Time") => {
    if (!selectedVariable1 || !selectedVariable2) {
      return;
    }

    setLoading(true);
    setError(null);
    setCalculatedData([]);
    setChartData([]);

    try {
      const requestBody = {
        variable1Id: selectedVariable1,
        variable2Id: selectedVariable2,
        operation: "subtract",
      };

      if (dateRange?.start) {
        requestBody.startDate = dateRange.start;
      }

      if (dateRange?.end) {
        requestBody.endDate = dateRange.end;
      }

      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(
          `Calculation failed: [${response.status}] ${response.statusText}`,
        );
      }

      const data = await response.json();
      const filtered = applyWindowFilter(data.calculatedData || [], selectedTimeFilter);
      setCalculatedData(filtered);
      setChartData(filtered);

      // Save to recent analyses
      saveToRecent({
        mode: "compare",
        variable1: variables.find((v) => v.id === selectedVariable1),
        variable2: variables.find((v) => v.id === selectedVariable2),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      setError("Failed to calculate data");
    } finally {
      setLoading(false);
    }
  };

  const saveToRecent = (analysis) => {
    const updated = [analysis, ...recentAnalyses].slice(0, 3);
    setRecentAnalyses(updated);
    localStorage.setItem("recentAnalyses", JSON.stringify(updated));
  };

  const toggleFavorite = () => {
    const fav = {
      mode,
      variable1Id: selectedVariable1,
      variable2Id: mode === "compare" ? selectedVariable2 : null,
      variable1Name: variables.find((v) => v.id === selectedVariable1)?.name,
      variable2Name:
        mode === "compare"
          ? variables.find((v) => v.id === selectedVariable2)?.name
          : null,
      timestamp: new Date().toISOString(),
    };

    const exists = favorites.find(
      (f) =>
        f.mode === mode &&
        f.variable1Id === selectedVariable1 &&
        (mode === "single" || f.variable2Id === selectedVariable2),
    );

    let updated;
    if (exists) {
      updated = favorites.filter(
        (f) =>
          !(
            f.mode === mode &&
            f.variable1Id === selectedVariable1 &&
            (mode === "single" || f.variable2Id === selectedVariable2)
          ),
      );
    } else {
      updated = [fav, ...favorites];
    }

    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  const isFavorited = () => {
    return favorites.some(
      (f) =>
        f.mode === mode &&
        f.variable1Id === selectedVariable1 &&
        (mode === "single" || f.variable2Id === selectedVariable2),
    );
  };

  const loadFavorite = (fav) => {
    setMode(fav.mode);
    setSelectedVariable1(fav.variable1Id);
    if (fav.mode === "compare") {
      setSelectedVariable2(fav.variable2Id);
    }
  };

  const loadRecent = (recent) => {
    setMode(recent.mode);
    setSelectedVariable1(recent.variable1.id);
    if (recent.mode === "compare" && recent.variable2) {
      setSelectedVariable2(recent.variable2.id);
    }
  };

  return {
    mode,
    setMode,
    variables,
    selectedVariable1,
    selectedVariable2,
    calculatedData,
    chartData,
    loading,
    error,
    favorites,
    recentAnalyses,
    setSelectedVariable1,
    setSelectedVariable2,
    fetchVariables,
    performCalculation,
    performSingleVariableAnalysis,
    toggleFavorite,
    isFavorited,
    loadFavorite,
    loadRecent,
  };
}
