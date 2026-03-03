import { useState, useEffect } from "react";

export function useDateRange() {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("All Time");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    if (selectedTimeFilter === "Custom") {
      if (customDateRange.from && customDateRange.to) {
        setDateRange({
          start: customDateRange.from.toISOString().split("T")[0],
          end: customDateRange.to.toISOString().split("T")[0],
        });
      } else {
        setDateRange({ start: null, end: null });
      }
      return;
    }

    setDateRange({ start: null, end: null });
  }, [selectedTimeFilter, customDateRange]);

  const handleTimeFilterClick = (filter) => {
    setSelectedTimeFilter(filter);
    if (filter === "Custom") {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
  };

  return {
    selectedTimeFilter,
    dateRange,
    showDatePicker,
    customDateRange,
    setShowDatePicker,
    setCustomDateRange,
    handleTimeFilterClick,
  };
}
