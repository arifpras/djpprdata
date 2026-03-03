import React, { useEffect } from "react";

export function VariableDictionary({ variables, theme = "light", highlightedVariableId = null }) {
  const palette =
    theme === "dark"
      ? {
          cardBg: "#181A20",
          border: "#2A2D36",
          title: "#E8EAF0",
          subText: "#AEB4C2",
          headerText: "#8B93A1",
          rowBorder: "#252933",
          bodyText: "#C7CDD9",
        }
      : {
          cardBg: "#FFFFFF",
          border: "#E8E9EF",
          title: "#1A1A1A",
          subText: "#8F93A1",
          headerText: "#8F93A1",
          rowBorder: "#F0F2F5",
          bodyText: "#4B4E59",
        };

  useEffect(() => {
    if (!highlightedVariableId) {
      return;
    }

    const target = document.getElementById(`dictionary-row-${highlightedVariableId}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedVariableId]);

  if (!variables || variables.length === 0) {
    return (
      <div
        className="border rounded-lg p-6 text-[14px]"
        style={{
          backgroundColor: palette.cardBg,
          borderColor: palette.border,
          color: palette.subText,
        }}
      >
        No variables available.
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg p-4 md:p-6"
      style={{ backgroundColor: palette.cardBg, borderColor: palette.border }}
    >
      <div className="mb-4">
        <h3 className="text-[16px] font-medium" style={{ color: palette.title }}>Indicator Reference Library</h3>
        <p className="text-[12px] mt-1" style={{ color: palette.subText }}>
          Quick reference for each indicator used in this dashboard.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="h-[40px] border-b" style={{ borderBottomColor: palette.border }}>
              <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headerText }}>
                Indicator
              </th>
              <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headerText }}>
                Type
              </th>
              <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headerText }}>
                Scope
              </th>
              <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headerText }}>
                Description
              </th>
              <th className="text-left text-[12px] font-semibold tracking-wider" style={{ color: palette.headerText }}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {variables.map((variable) => (
              <tr
                key={variable.id}
                id={`dictionary-row-${variable.id}`}
                className="border-t align-top"
                style={{
                  borderTopColor: palette.rowBorder,
                  backgroundColor:
                    highlightedVariableId && String(highlightedVariableId) === String(variable.id)
                      ? theme === "dark"
                        ? "#232734"
                        : "#EEF3FF"
                      : "transparent",
                }}
              >
                <td className="py-3 pr-3 text-[12px] font-medium whitespace-nowrap" style={{ color: palette.title }}>
                  {variable.name}
                </td>
                <td className="py-3 pr-3 text-[12px] whitespace-nowrap" style={{ color: palette.bodyText }}>
                  <div>{variable.family || "-"}</div>
                  <div className="text-[11px]" style={{ color: palette.subText }}>{variable.metric || ""}</div>
                </td>
                <td className="py-3 pr-3 text-[12px] min-w-[170px]" style={{ color: palette.bodyText }}>
                  <div>{variable.scope || "-"}</div>
                  <div className="text-[11px]" style={{ color: palette.subText }}>
                    {Array.isArray(variable.entities) && variable.entities.length > 0
                      ? variable.entities.join(", ")
                      : "Entities inferred from market grouping"}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: palette.subText }}>
                    {variable.tenor ? `Tenor: ${variable.tenor}` : ""}
                    {variable.tenor && variable.maturity ? " • " : ""}
                    {variable.maturity ? `Maturity: ${variable.maturity}` : ""}
                  </div>
                </td>
                <td className="py-3 pr-3 text-[12px] min-w-[320px]" style={{ color: palette.bodyText }}>
                  {variable.description || "No description available."}
                  <div className="text-[11px] mt-1" style={{ color: palette.subText }}>
                    Confidence: {variable.confidence || "Medium"}
                  </div>
                </td>
                <td className="py-3 text-[12px] whitespace-nowrap" style={{ color: palette.subText }}>
                  {variable.sourceTable || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VariableDictionary;
