import {
  findDateColumn,
  getSqliteDb,
  getTableColumns,
  parseVariableId,
  quoteSqlIdentifier,
} from "@/app/api/utils/sqlite";

// Get data points for specific variables within a date range
export async function GET(request) {
  try {
    const db = getSqliteDb();
    const { searchParams } = new URL(request.url);
    const variableIds =
      searchParams.get("variableIds")?.split(",").filter(Boolean) || [];
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (variableIds.length === 0) {
      return Response.json({ dataPoints: [] });
    }

    const variable = parseVariableId(variableIds[0]);
    if (!variable) {
      return Response.json({ dataPoints: [] });
    }

    const { tableName, columnName } = variable;
    const columns = getTableColumns(db, tableName);
    const dateColumn = findDateColumn(columns);
    const hasColumn = columns.some((column) => column.name === columnName);

    if (!dateColumn || !hasColumn) {
      return Response.json({ dataPoints: [] });
    }

    const tableSql = quoteSqlIdentifier(tableName);
    const valueSql = quoteSqlIdentifier(columnName);
    const dateSql = quoteSqlIdentifier(dateColumn);

    let query = `
      SELECT
        ${dateSql} AS recorded_at,
        CAST(${valueSql} AS REAL) AS value
      FROM ${tableSql}
      WHERE ${valueSql} IS NOT NULL
    `;

    const params = [];

    if (startDate) {
      query += ` AND ${dateSql} >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND ${dateSql} <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY ${dateSql} ASC`;

    const statement = db.prepare(query);
    const rows = statement.all(...params);
    const dataPoints = rows.map((row, index) => ({
      id: index + 1,
      variable_id: `${tableName}::${columnName}`,
      variable_name: columnName,
      unit: "",
      recorded_at: row.recorded_at,
      value: Number(row.value),
    }));

    return Response.json({ dataPoints });
  } catch (error) {
    console.error("Error fetching data points:", error);
    return Response.json(
      { error: "Failed to fetch data points" },
      { status: 500 },
    );
  }
}
