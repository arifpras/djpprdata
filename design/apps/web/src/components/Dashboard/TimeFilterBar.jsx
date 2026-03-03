import React from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const timeFilters = [
  "All Time",
  "30 Days",
  "Year",
  "Year to Date",
  "Month to Date",
  "Custom",
];

export function TimeFilterBar({
  theme = "light",
  selectedTimeFilter,
  dateRange,
  showDatePicker,
  customDateRange,
  onTimeFilterClick,
  onToggleDatePicker,
  onDateRangeSelect,
}) {
  const palette =
    theme === "dark"
      ? {
          chipBg: "#242831",
          chipText: "#C6CBD7",
          chipHover: "#303540",
          activeBg: "#4D7DFF",
          activeText: "#FFFFFF",
          inputBg: "#1B1D24",
          inputBorder: "#3A3D47",
          inputText: "#E8EAF0",
          calendarBg: "#1B1D24",
          calendarBorder: "#3A3D47",
        }
      : {
          chipBg: "#F5F6F9",
          chipText: "#4B4E59",
          chipHover: "#E4E6EB",
          activeBg: "#2962FF",
          activeText: "#FFFFFF",
          inputBg: "#FFFFFF",
          inputBorder: "#E4E6EB",
          inputText: "#4B4E59",
          calendarBg: "#FFFFFF",
          calendarBorder: "#E4E6EB",
        };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {timeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onTimeFilterClick(filter)}
            className="h-[28px] px-4 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap leading-none"
            style={
              selectedTimeFilter === filter
                ? {
                    backgroundColor: palette.activeBg,
                    color: palette.activeText,
                  }
                : {
                    backgroundColor: palette.chipBg,
                    color: palette.chipText,
                  }
            }
            onMouseEnter={(event) => {
              if (selectedTimeFilter !== filter) {
                event.currentTarget.style.backgroundColor = palette.chipHover;
              }
            }}
            onMouseLeave={(event) => {
              if (selectedTimeFilter !== filter) {
                event.currentTarget.style.backgroundColor = palette.chipBg;
              }
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={() => onToggleDatePicker(!showDatePicker)}
          className="h-[32px] px-4 border rounded-lg flex items-center space-x-2 transition-colors whitespace-nowrap"
          style={{
            backgroundColor: palette.inputBg,
            borderColor: palette.inputBorder,
            color: palette.inputText,
          }}
        >
          <Calendar size={16} style={{ color: palette.inputText }} />
          <span className="text-[12px]" style={{ color: palette.inputText }}>
            {selectedTimeFilter === "Custom"
              ? dateRange.start && dateRange.end
                ? `${new Date(dateRange.start).toLocaleDateString()} — ${new Date(dateRange.end).toLocaleDateString()}`
                : "Select date range"
              : selectedTimeFilter}
          </span>
        </button>

        {showDatePicker && (
          <div
            className="absolute top-full mt-2 left-0 rounded-lg shadow-lg z-50 p-4"
            style={{
              backgroundColor: palette.calendarBg,
              border: `1px solid ${palette.calendarBorder}`,
            }}
          >
            <DayPicker
              mode="range"
              selected={customDateRange}
              onSelect={(range) => {
                onDateRangeSelect(range || { from: undefined, to: undefined });
              }}
              numberOfMonths={2}
              className="text-[14px]"
            />
            <div className="flex justify-end mt-2 pt-2" style={{ borderTop: `1px solid ${palette.calendarBorder}` }}>
              <button
                onClick={() => onToggleDatePicker(false)}
                className="px-4 py-1 text-[12px]"
                style={{ color: palette.inputText }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
