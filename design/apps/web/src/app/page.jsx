import React, { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useNavigate } from "react-router";
import { Chart } from "@/components/Dashboard/Chart";
import { DataTable } from "@/components/Dashboard/DataTable";
import { BondPricePrediction } from "@/components/Dashboard/BondPricePrediction";
import { Header } from "@/components/Dashboard/Header";
import { IndicatorSelector } from "@/components/Dashboard/IndicatorSelector";
import { MarketUpdate } from "@/components/Dashboard/MarketUpdate";
import { PrimaryAuctionAnalysis } from "@/components/Dashboard/PrimaryAuctionAnalysis";
import { Sidebar } from "@/components/Dashboard/Sidebar";
import { StatisticsCards } from "@/components/Dashboard/StatisticsCards";
import { TimeFilterBar } from "@/components/Dashboard/TimeFilterBar";
import { VariableDictionary } from "@/components/Dashboard/VariableDictionary";
import { YieldCurveAnalysis } from "@/components/Dashboard/YieldCurveAnalysis";
import { useDateRange } from "@/hooks/useDateRange";
import { useMacroeconomicData } from "@/hooks/useMacroeconomicData";
import { calculateStats } from "@/utils/statisticsCalculator";
import { isDashboardAuthenticated } from "@/utils/auth";

export default function Page() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [viewMode, setViewMode] = useState("web");
  const [authReady, setAuthReady] = useState(false);
  const [highlightedDictionaryId, setHighlightedDictionaryId] = useState(null);
  const {
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
  } = useMacroeconomicData();

  const {
    selectedTimeFilter,
    dateRange,
    showDatePicker,
    customDateRange,
    setShowDatePicker,
    setCustomDateRange,
    handleTimeFilterClick,
  } = useDateRange();

  const stats = useMemo(() => calculateStats(calculatedData, mode), [calculatedData, mode]);

  useEffect(() => {
    if (!isDashboardAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    setAuthReady(true);
  }, [navigate]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("dashboard-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    setTheme("dark");
  }, []);

  useEffect(() => {
    const storedViewMode = localStorage.getItem("dashboard-view-mode");
    if (storedViewMode === "web" || storedViewMode === "tablet" || storedViewMode === "phone") {
      setViewMode(storedViewMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("dashboard-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "phone" || viewMode === "tablet") {
      setSidebarOpen(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    fetchVariables();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (
      selectedTimeFilter === "Custom" &&
      (!dateRange.start || !dateRange.end)
    ) {
      return;
    }

    if (
      mode === "dictionary"
      || mode === "market-update"
      || mode === "yield-curve"
      || mode === "primary-auction"
      || mode === "bond-prediction"
    ) {
      return;
    }

    if (mode === "single") {
      performSingleVariableAnalysis(dateRange, selectedTimeFilter);
      return;
    }

    performCalculation(dateRange, selectedTimeFilter);
  }, [
    mode,
    selectedVariable1,
    selectedVariable2,
    selectedTimeFilter,
    dateRange.start,
    dateRange.end,
    variables.length,
    authReady,
  ]);

  const handleHeaderSelectIndicator = (variableId) => {
    if (!variableId) {
      return;
    }

    setSelectedVariable1(variableId);
    setHighlightedDictionaryId(variableId);
    setMode("dictionary");
  };

  const handleOpenProfile = () => {
    navigate("/profile");
  };

  if (!authReady) {
    return null;
  }

  const viewFrameClass =
    viewMode === "phone"
      ? "max-w-[430px]"
      : viewMode === "tablet"
        ? "max-w-[900px]"
        : "max-w-none";

  const mainPaddingClass =
    viewMode === "phone"
      ? "p-3"
      : viewMode === "tablet"
        ? "p-4 md:p-5 lg:p-6"
        : "p-4 md:p-6 lg:p-8";

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-[#111216] text-[#E8EAF0]" : "bg-[#F0F2F5] text-[#1A1A1A]"
      }`}
    >
      <div className={`flex min-h-screen mx-auto w-full ${viewFrameClass}`}>
        <Sidebar
          stats={stats}
          mode={mode}
          setMode={setMode}
          favorites={favorites}
          recentAnalyses={recentAnalyses}
          loadFavorite={loadFavorite}
          loadRecent={loadRecent}
          onManageIndicators={() => navigate("/manage-indicators")}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          theme={theme}
          viewMode={viewMode}
        />

        <div className="flex-1 min-w-0 md:ml-0">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            theme={theme}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            variables={variables}
            onSelectIndicator={handleHeaderSelectIndicator}
            onOpenProfile={handleOpenProfile}
          />

          <main className={mainPaddingClass}>
            {mode === "market-update" ? (
              <MarketUpdate theme={theme} />
            ) : mode === "yield-curve" ? (
              <YieldCurveAnalysis theme={theme} />
            ) : mode === "primary-auction" ? (
              <PrimaryAuctionAnalysis theme={theme} />
            ) : mode === "bond-prediction" ? (
              <BondPricePrediction theme={theme} />
            ) : mode === "dictionary" ? (
              <VariableDictionary
                variables={variables}
                theme={theme}
                highlightedVariableId={highlightedDictionaryId}
              />
            ) : (
              <>
                <div className="mb-4 md:mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <TimeFilterBar
                    theme={theme}
                    selectedTimeFilter={selectedTimeFilter}
                    dateRange={dateRange}
                    showDatePicker={showDatePicker}
                    customDateRange={customDateRange}
                    onTimeFilterClick={handleTimeFilterClick}
                    onToggleDatePicker={setShowDatePicker}
                    onDateRangeSelect={setCustomDateRange}
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFavorite}
                      disabled={
                        !selectedVariable1 ||
                        (mode === "compare" && !selectedVariable2)
                      }
                      className={`h-[36px] w-[36px] rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors ${
                        theme === "dark"
                          ? "border-[#3A3D47] bg-[#1B1D24] text-[#E8EAF0] hover:text-white"
                          : "border-[#D0D3DA] bg-white text-[#4B4E59] hover:text-[#1A1A1A]"
                      }`}
                      aria-label="Save favorite analysis"
                      title="Save favorite analysis"
                    >
                      <Star
                        size={14}
                        className={isFavorited() ? "fill-[#FFB800] text-[#FFB800]" : ""}
                      />
                    </button>
                  </div>
                </div>

                <IndicatorSelector
                  theme={theme}
                  mode={mode}
                  variables={variables}
                  selectedVariable1={selectedVariable1}
                  selectedVariable2={selectedVariable2}
                  onVariable1Change={setSelectedVariable1}
                  onVariable2Change={setSelectedVariable2}
                  error={error}
                />

                <StatisticsCards stats={stats} mode={mode} theme={theme} />

                <Chart
                  chartData={chartData}
                  calculatedData={calculatedData}
                  stats={stats}
                  loading={loading}
                  mode={mode}
                  selectedTimeFilter={selectedTimeFilter}
                  variables={variables}
                  selectedVariable1={selectedVariable1}
                  theme={theme}
                />

                <DataTable
                  calculatedData={calculatedData}
                  mode={mode}
                  variables={variables}
                  selectedVariable1={selectedVariable1}
                  selectedTimeFilter={selectedTimeFilter}
                  theme={theme}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
