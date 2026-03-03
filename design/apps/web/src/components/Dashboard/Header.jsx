import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Bell, ChevronDown, Menu, Monitor, Moon, Smartphone, Sun, Tablet, User } from "lucide-react";
import logoLight from "@/assets/logos/logo-light.png";
import logoDark from "@/assets/logos/logo-dark.png";

export function Header({
  sidebarOpen,
  setSidebarOpen,
  theme = "light",
  viewMode = "web",
  onChangeViewMode,
  onToggleTheme,
  variables = [],
  onSelectIndicator,
  onOpenProfile,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);
  const headerLogo = theme === "dark" ? logoDark : logoLight;
  const isCompactMode = viewMode === "phone" || viewMode === "tablet";


  const palette =
    theme === "dark"
      ? {
          bg: "#181A20",
          border: "#2A2D36",
          icon: "#AEB4C2",
          searchBorder: "#3A3D47",
          searchText: "#E8EAF0",
          searchPlaceholder: "#8B93A1",
          userText: "#E8EAF0",
          avatarBg: "#3A3D47",
          avatarInnerBg: "#FFFFFF",
          avatarRing: "#000000",
          buttonBorder: "#3A3D47",
          buttonText: "#C3C8D4",
          buttonHover: "#E8EAF0",
          panelBg: "#1B1D24",
          panelBorder: "#3A3D47",
        }
      : {
          bg: "#FFFFFF",
          border: "#E4E6EB",
          icon: "#8F93A1",
          searchBorder: "#E4E6EB",
          searchText: "#4B4E59",
          searchPlaceholder: "#ACB1C0",
          userText: "#1A1A1A",
          avatarBg: "#D1D5DB",
          avatarInnerBg: "#FFFFFF",
          avatarRing: "#D0D3DA",
          buttonBorder: "#D0D3DA",
          buttonText: "#4B4E59",
          buttonHover: "#1A1A1A",
          panelBg: "#FFFFFF",
          panelBorder: "#E4E6EB",
        };

  const filteredIndicators = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return variables
      .filter((variable) => {
        const name = String(variable?.name || "").toLowerCase();
        const unit = String(variable?.unit || "").toLowerCase();
        return name.includes(query) || unit.includes(query);
      })
      .sort((left, right) => {
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
  }, [searchQuery, variables]);

  useEffect(() => {
    const onDocumentClick = (event) => {
      const target = event.target;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchResults(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const handleSearchSelect = (indicator) => {
    setSearchQuery(indicator?.name || "");
    setShowSearchResults(false);
    onSelectIndicator?.(indicator?.id);
  };

  const handleSearchSubmit = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    if (filteredIndicators.length > 0) {
      handleSearchSelect(filteredIndicators[0]);
    }
  };

  return (
    <div
      className="h-[64px] border-b flex items-center px-4 md:px-8"
      style={{ backgroundColor: palette.bg, borderBottomColor: palette.border }}
    >
      <button className={isCompactMode ? "mr-4" : "md:hidden mr-4"} onClick={() => setSidebarOpen(true)}>
        <Menu size={20} style={{ color: palette.icon }} />
      </button>

      <div
        className={`relative ${
          isCompactMode
            ? "flex-1 min-w-0 max-w-none"
            : "flex-1 min-w-0 max-w-none lg:max-w-[480px]"
        }`}
        ref={searchRef}
      >
        <div
          className="h-[36px] border rounded-md flex items-center px-4"
          style={{ borderColor: palette.searchBorder }}
        >
          <Search size={16} className="mr-3" style={{ color: palette.icon }} />
          <input
            type="text"
            placeholder={isCompactMode ? "Search indicators" : "Search indicators…"}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            onKeyDown={handleSearchSubmit}
            className={`flex-1 text-[14px] bg-transparent outline-none ${
              theme === "dark" ? "placeholder:text-[#8B93A1]" : "placeholder:text-[#ACB1C0]"
            }`}
            style={{ color: palette.searchText }}
          />
        </div>

        {showSearchResults && searchQuery.trim() && (
          <div
            className="absolute top-[42px] left-0 right-0 rounded-lg border shadow-sm z-50 max-h-[260px] overflow-y-auto"
            style={{ backgroundColor: palette.panelBg, borderColor: palette.panelBorder }}
          >
            {filteredIndicators.length === 0 ? (
              <div className="px-3 py-2 text-[12px]" style={{ color: palette.icon }}>
                No indicators found.
              </div>
            ) : (
              filteredIndicators.map((indicator) => (
                <button
                  key={indicator.id}
                  onClick={() => handleSearchSelect(indicator)}
                  className="w-full text-left px-3 py-2 text-[12px] border-b last:border-b-0"
                  style={{
                    color: palette.searchText,
                    borderColor: palette.panelBorder,
                  }}
                >
                  {indicator.unit ? `${indicator.name} (${indicator.unit})` : indicator.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="hidden md:flex mx-auto items-center justify-center">
        <img src={headerLogo} alt="DJPPR" className="h-7 w-auto max-w-[180px] object-contain" />
      </div>

      <div className="ml-auto flex items-center space-x-2 md:space-x-4">
        <div className="relative hidden md:block" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications((open) => !open)}
            className="inline-flex items-center"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={20} style={{ color: palette.icon }} />
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 top-[30px] w-[260px] rounded-lg border shadow-sm z-50 p-3"
              style={{ backgroundColor: palette.panelBg, borderColor: palette.panelBorder }}
            >
              <div className="text-[12px] font-medium" style={{ color: palette.searchText }}>
                Notifications
              </div>
              <div className="text-[11px] mt-2" style={{ color: palette.icon }}>
                Search indicators to quickly update your selected variables.
              </div>
              <div className="text-[11px] mt-1" style={{ color: palette.icon }}>
                Loaded indicators: {variables.length}
              </div>
            </div>
          )}
        </div>

        <div
          className="h-[32px] px-1 rounded-lg border inline-flex items-center gap-1"
          style={{ borderColor: palette.buttonBorder }}
          aria-label="Select view mode"
          title="Select view mode"
        >
          {[
            { key: "web", label: "Web", icon: Monitor },
            { key: "tablet", label: "Tablet", icon: Tablet },
            { key: "phone", label: "Phone", icon: Smartphone },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = viewMode === option.key;

            return (
              <button
                key={option.key}
                onClick={() => onChangeViewMode?.(option.key)}
                className="h-[24px] px-2 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors"
                style={{
                  color: isActive ? palette.buttonHover : palette.buttonText,
                  backgroundColor: isActive
                    ? theme === "dark"
                      ? "#2B3140"
                      : "#EAECEF"
                    : "transparent",
                }}
                aria-label={`Switch to ${option.label} mode`}
                title={option.label}
              >
                <Icon size={12} />
                <span className="hidden md:inline">{option.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleTheme}
          className="h-[32px] px-2 md:px-3 rounded-lg border text-[12px] font-medium inline-flex items-center gap-2 transition-colors"
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
          aria-label="Toggle light/dark theme"
          title="Toggle light/dark theme"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          <span className="hidden md:inline">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((open) => !open)}
            className="inline-flex items-center gap-2"
            aria-label="User menu"
            title="User menu"
          >
            <div
              className="w-8 h-8 rounded-full p-[1px]"
              style={{
                backgroundColor: palette.avatarRing,
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{ backgroundColor: palette.avatarInnerBg }}
              >
                <img
                  src="https://img.icons8.com/?size=100&id=CxsfjQ9qnPcX&format=png&color=000000"
                  alt="User avatar"
                  className="w-full h-full object-cover"
                  style={{ filter: "none" }}
                />
              </div>
            </div>
            <span className="text-[12px] hidden lg:block" style={{ color: palette.userText }}>
              Economist
            </span>
            <ChevronDown size={16} className="hidden lg:block" style={{ color: palette.icon }} />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-[38px] w-[180px] rounded-lg border shadow-sm z-50 py-1"
              style={{ backgroundColor: palette.panelBg, borderColor: palette.panelBorder }}
            >
              <button
                className="w-full px-3 py-2 text-[12px] text-left inline-flex items-center gap-2"
                style={{ color: palette.searchText }}
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenProfile?.();
                }}
              >
                <User size={14} />
                Profile
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
