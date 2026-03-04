import React from "react";
import {
  Menu,
  X,
  Minus,
  GitBranch,
  LineChart,
  ArrowLeftRight,
  BookOpen,
  Newspaper,
  Star,
  Clock,
  Database,
  Bot,
  ChevronRight,
  LogOut,
} from "lucide-react";
import logoLight from "@/assets/logos/logo-light.png";
import logoDark from "@/assets/logos/logo-dark.png";
import { clearDashboardAuthenticated } from "@/utils/auth";

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

export function Sidebar({
  stats,
  mode,
  setMode,
  favorites = [],
  recentAnalyses = [],
  loadFavorite,
  loadRecent,
  onManageIndicators,
  sidebarOpen,
  setSidebarOpen,
  theme = "light",
  viewMode = "web",
}) {
  const sidebarLogo = theme === "dark" ? logoDark : logoLight;
  const isCompactMode = viewMode === "phone" || viewMode === "tablet";

  const sidebarClassName = isCompactMode
    ? `${sidebarOpen ? "w-[280px]" : "w-0"} h-screen inset-y-0 left-0 flex flex-col border-r transition-all duration-300 overflow-hidden fixed z-50`
    : `${sidebarOpen ? "w-[280px]" : "w-0"} md:w-[280px] min-h-screen flex flex-col border-r transition-all duration-300 overflow-hidden fixed md:relative z-50`;

  const palette =
    theme === "dark"
      ? {
          bg: "#151821",
          border: "#343A46",
          title: "#E8EAF0",
          subText: "#C2C8D3",
          sectionLabel: "#98A1B3",
          buttonText: "#D0D6E1",
          buttonHover: "#2B3140",
          statLabel: "#C2C8D3",
          statValue: "#E8EAF0",
        }
      : {
          bg: "#F7F8FA",
          border: "#E4E6EB",
          title: "#1A1A1A",
          subText: "#8F93A1",
          sectionLabel: "#B0B3C0",
          buttonText: "#4B4E59",
          buttonHover: "#E4E6EB",
          statLabel: "#4B4E59",
          statValue: "#1A1A1A",
        };

  const inactiveButtonClass =
    theme === "dark"
      ? "text-[#D0D6E1] hover:bg-[#343B4D]"
      : "text-[#4B4E59] hover:bg-[#E4E6EB]";

  const closeSidebarOnPhone = () => {
    if (isCompactMode) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    clearDashboardAuthenticated();
    closeSidebarOnPhone();
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  };

  return (
    <div
      className={sidebarClassName}
      style={{ backgroundColor: palette.bg, borderRightColor: palette.border }}
    >
      <div className="h-[56px] flex items-center px-5 border-b" style={{ borderBottomColor: palette.border }}>
        <Menu size={20} style={{ color: palette.subText }} strokeWidth={1.5} />
        <img src={sidebarLogo} alt="DJPPR" className="ml-2 h-5 w-auto max-w-[84px] object-contain" />
        <span className="ml-2 text-[14px] font-medium truncate" style={{ color: palette.title }}>
          Macro Analytics
        </span>
        <X
          size={20}
          className="ml-auto cursor-pointer md:hidden"
          style={{ color: palette.subText }}
          onClick={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 px-5 py-6 overflow-y-auto">
        <div
          className="mb-6 rounded-lg border py-2.5 flex justify-center"
          style={{
            borderColor: palette.border,
            backgroundColor: theme === "dark" ? "#1D2130" : "#F7F8FC",
          }}
        >
          <img src={sidebarLogo} alt="DJPPR" className="h-9 w-auto max-w-[200px] object-contain" />
        </div>

        {/* Mode Switcher */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: palette.sectionLabel }}>
            ANALYSIS MODE
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                setMode("market-update");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "market-update"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <Newspaper size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Market Intelligence Briefing</span>
            </button>
            <button
              onClick={() => {
                setMode("single");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "single"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <LineChart size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Single-Series Analysis</span>
            </button>
            <button
              onClick={() => {
                setMode("compare");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "compare"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <ArrowLeftRight size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Relative-Value Analysis</span>
            </button>
            <button
              onClick={() => {
                setMode("yield-curve");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "yield-curve"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <GitBranch size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Indonesia Yield Curve Analysis</span>
            </button>
            <button
              onClick={() => {
                setMode("primary-auction");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "primary-auction"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <Minus size={16} className="mr-3" strokeWidth={1.5} />
              <span className="flex-1 text-left text-[13px] font-medium">Primary Market Auction Analysis</span>
            </button>
            <button
              onClick={() => {
                setMode("perisai-bot");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "perisai-bot"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <Bot size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">PerisAI Chatbot</span>
            </button>
            <button
              onClick={() => {
                setMode("bond-prediction");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "bond-prediction"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <Database size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Bond Price Prediction</span>
            </button>
            <button
              onClick={() => {
                setMode("dictionary");
                closeSidebarOnPhone();
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                mode === "dictionary"
                  ? "bg-[#2962FF] text-white"
                  : inactiveButtonClass
              }`}
            >
              <BookOpen size={16} className="mr-3" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Indicator Reference Library</span>
            </button>
          </div>
        </div>

        {/* Recent Analyses */}
        {recentAnalyses.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-semibold tracking-wider mb-3 flex items-center" style={{ color: palette.sectionLabel }}>
              <Clock size={10} className="mr-1" />
              RECENT ANALYSES
            </div>
            <div className="space-y-1">
              {recentAnalyses.slice(0, 3).map((recent, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    loadRecent(recent);
                    closeSidebarOnPhone();
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors text-left ${inactiveButtonClass}`}
                >
                  <ChevronRight size={12} className="mr-2 flex-shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-medium truncate">
                      {recent.variable1?.name}
                      {recent.mode === "compare" &&
                        recent.variable2 &&
                        ` - ${recent.variable2.name}`}
                    </div>
                    <div className="text-[9px]" style={{ color: palette.subText }}>
                      {new Date(recent.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-semibold tracking-wider mb-3 flex items-center" style={{ color: palette.sectionLabel }}>
              <Star size={10} className="mr-1" />
              SAVED FAVORITES
            </div>
            <div className="space-y-1">
              {favorites.slice(0, 5).map((fav, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    loadFavorite(fav);
                    closeSidebarOnPhone();
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors text-left ${inactiveButtonClass}`}
                >
                  <Star
                    size={12}
                    className="mr-2 fill-[#FFB800] text-[#FFB800] flex-shrink-0"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-medium truncate">
                      {fav.variable1Name}
                      {fav.mode === "compare" &&
                        fav.variable2Name &&
                        ` - ${fav.variable2Name}`}
                    </div>
                    <div className="text-[9px] capitalize" style={{ color: palette.subText }}>
                      {fav.mode}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manage Indicators Link */}
        <div className="mt-8 pt-6 border-t" style={{ borderTopColor: palette.border }}>
          <button
            onClick={() => {
              onManageIndicators();
              closeSidebarOnPhone();
            }}
            className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${inactiveButtonClass}`}
          >
            <Database size={16} className="mr-3" strokeWidth={1.5} />
            <span className="text-[13px] font-medium">Manage Indicators</span>
          </button>

          <button
            onClick={handleLogout}
            className={`mt-2 w-full flex items-center px-3 py-2 rounded-lg transition-colors ${inactiveButtonClass}`}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={16} className="mr-3" strokeWidth={1.5} />
            <span className="text-[13px] font-medium">Logout</span>
          </button>

          <div className="mt-4 flex flex-col items-center gap-2">
            <div
              className="h-px w-16"
              style={{ backgroundColor: theme === "dark" ? "#3A3D47" : "#D0D3DA" }}
            />
            <p className="text-[12px] leading-relaxed text-center" style={{ color: palette.sectionLabel }}>
              © 2026 Tim Kerja Pembangunan Sistem Automasi Pengelolaan Data SBN, DJPPR, Kemenkeu. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
