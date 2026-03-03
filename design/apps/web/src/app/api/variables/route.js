import {
  buildIndicatorDescription,
  buildIndicatorDisplayName,
  findDateColumn,
  getSqliteDb,
  getTableColumns,
  humanizeIdentifier,
  isNumericColumn,
  parseIndicatorMeta,
} from "@/app/api/utils/sqlite";

// Get all variables
export async function GET(request) {
  try {
    const db = getSqliteDb();
    const tables = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name ASC
        `,
      )
      .all();

    const variables = [];

    for (const table of tables) {
      const tableName = table.name;
      const columns = getTableColumns(db, tableName);
      const dateColumn = findDateColumn(columns);
      const numericColumns = columns.filter(
        (column) => column.name !== dateColumn && isNumericColumn(column),
      );

      for (const column of numericColumns) {
        const columnName = column.name;
        const id = `${tableName}::${columnName}`;
        const displayName = buildIndicatorDisplayName(tableName, columnName);
        const meta = parseIndicatorMeta(tableName, columnName);

        variables.push({
          id,
          name: displayName,
          description: buildIndicatorDescription(tableName, columnName),
          unit: "",
          sourceTable: humanizeIdentifier(tableName),
          sourceColumn: humanizeIdentifier(columnName),
          family: meta.family,
          metric: meta.metric,
          scope: meta.scope,
          entities: meta.entities,
          tenor: meta.tenor,
          maturity: meta.maturity,
          confidence: meta.confidence,
          created_at: null,
        });
      }
    }

    return Response.json({ variables });
  } catch (error) {
    console.error("Error fetching variables:", error);
    return Response.json(
      { error: "Failed to fetch variables" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  return Response.json(
    { error: "Variables are read-only from the SQLite source file." },
    { status: 405 },
  );
}
